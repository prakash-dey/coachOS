create type public.workspace_approval_status as enum (
  'pending_review',
  'approved',
  'rejected'
);

create table public.super_admins (
  user_id uuid primary key
    references auth.users (id)
    on delete cascade,

  created_at timestamptz not null default now()
);

alter table public.workspaces
add column if not exists approval_status public.workspace_approval_status not null default 'pending_review',
add column if not exists approval_reviewed_at timestamptz,
add column if not exists approval_reviewed_by uuid references auth.users(id) on delete set null,
add column if not exists approval_note text;

update public.workspaces
set
  approval_status = 'approved',
  approval_reviewed_at = coalesce(approval_reviewed_at, now())
where approval_status = 'pending_review';

alter table public.workspaces
drop constraint if exists workspaces_approval_note_length;

alter table public.workspaces
add constraint workspaces_approval_note_length
check (
  approval_note is null
  or char_length(approval_note) <= 1000
);

create index if not exists workspaces_approval_status_created_idx
on public.workspaces (approval_status, created_at desc);

create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.super_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_super_admin() from public;
grant execute on function private.is_super_admin() to authenticated;

create or replace function private.is_workspace_owner(
  target_workspace_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspaces
    where id = target_workspace_id
      and owner_id = (select auth.uid())
      and (
        is_demo
        or approval_status = 'approved'
      )
  );
$$;

create or replace function private.prevent_workspace_approval_self_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.owner_id = (select auth.uid())
    and old.approval_status = 'rejected'
    and new.approval_status = 'pending_review'
    and new.approval_reviewed_at is null
    and new.approval_reviewed_by is null
    and new.approval_note is null then
    return new;
  end if;

  if (
    old.approval_status is distinct from new.approval_status
    or old.approval_reviewed_at is distinct from new.approval_reviewed_at
    or old.approval_reviewed_by is distinct from new.approval_reviewed_by
    or old.approval_note is distinct from new.approval_note
  ) and not private.is_super_admin() then
    raise exception using
      errcode = '42501',
      message = 'Only super admins can review workspaces';
  end if;

  return new;
end;
$$;

drop trigger if exists workspaces_prevent_approval_self_update on public.workspaces;

create trigger workspaces_prevent_approval_self_update
before update on public.workspaces
for each row
execute function private.prevent_workspace_approval_self_update();

create or replace function private.approve_demo_workspace_on_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_demo then
    new.approval_status := 'approved';
    new.approval_reviewed_at := coalesce(new.approval_reviewed_at, now());
  end if;

  return new;
end;
$$;

drop trigger if exists workspaces_approve_demo_on_insert on public.workspaces;

create trigger workspaces_approve_demo_on_insert
before insert on public.workspaces
for each row
execute function private.approve_demo_workspace_on_insert();

drop policy if exists super_admins_select_own_or_admin on public.super_admins;
drop policy if exists workspaces_select_accessible on public.workspaces;
drop policy if exists workspaces_update_owned on public.workspaces;
drop policy if exists workspaces_update_super_admin_review on public.workspaces;

alter table public.super_admins enable row level security;

grant select on table public.super_admins to authenticated;

create policy super_admins_select_own_or_admin
on public.super_admins
for select
to authenticated
using (
  user_id = (select auth.uid())
  or private.is_super_admin()
);

create policy workspaces_select_accessible
on public.workspaces
for select
to authenticated
using (
  owner_id = (select auth.uid())
  or private.is_active_workspace_member(id)
  or private.is_super_admin()
);

create policy workspaces_update_owned
on public.workspaces
for update
to authenticated
using (
  owner_id = (select auth.uid())
)
with check (
  owner_id = (select auth.uid())
);

create policy workspaces_update_super_admin_review
on public.workspaces
for update
to authenticated
using (
  private.is_super_admin()
)
with check (
  private.is_super_admin()
);

create or replace function public.complete_coach_onboarding(
  full_name text,
  workspace_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  created_workspace_id uuid;
begin
  if current_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication required';
  end if;

  if char_length(btrim(full_name)) not between 1 and 120 then
    raise exception using
      errcode = '22023',
      message = 'Full name must contain between 1 and 120 characters';
  end if;

  if char_length(btrim(workspace_name)) not between 1 and 120 then
    raise exception using
      errcode = '22023',
      message = 'Workspace name must contain between 1 and 120 characters';
  end if;

  if exists (
    select 1
    from public.workspaces
    where owner_id = current_user_id
  ) then
    raise exception using
      errcode = '23505',
      message = 'Coach onboarding has already been completed';
  end if;

  insert into public.profiles (
    id,
    full_name
  )
  values (
    current_user_id,
    btrim(full_name)
  )
  on conflict (id) do update
  set full_name = excluded.full_name;

  insert into public.workspaces (
    name,
    owner_id,
    approval_status
  )
  values (
    btrim(workspace_name),
    current_user_id,
    'pending_review'
  )
  returning id into created_workspace_id;

  insert into public.workspace_members (
    workspace_id,
    user_id,
    role,
    status
  )
  values (
    created_workspace_id,
    current_user_id,
    'coach',
    'active'
  );

  return created_workspace_id;
end;
$$;

revoke all
on function public.complete_coach_onboarding(text, text)
from public;

grant execute
on function public.complete_coach_onboarding(text, text)
to authenticated;

create or replace function public.request_workspace_review_again(
  full_name text,
  workspace_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_workspace_id uuid;
begin
  if current_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication required';
  end if;

  if char_length(btrim(full_name)) not between 1 and 120 then
    raise exception using
      errcode = '22023',
      message = 'Full name must contain between 1 and 120 characters';
  end if;

  if char_length(btrim(workspace_name)) not between 1 and 120 then
    raise exception using
      errcode = '22023',
      message = 'Workspace name must contain between 1 and 120 characters';
  end if;

  select id
  into target_workspace_id
  from public.workspaces
  where owner_id = current_user_id
    and approval_status = 'rejected'
    and not is_demo;

  if target_workspace_id is null then
    raise exception using
      errcode = '42501',
      message = 'Only rejected workspaces can request another review';
  end if;

  insert into public.profiles (
    id,
    full_name
  )
  values (
    current_user_id,
    btrim(full_name)
  )
  on conflict (id) do update
  set full_name = excluded.full_name;

  update public.workspaces
  set
    name = btrim(workspace_name),
    approval_status = 'pending_review',
    approval_reviewed_at = null,
    approval_reviewed_by = null,
    approval_note = null
  where id = target_workspace_id
    and owner_id = current_user_id
    and approval_status = 'rejected'
  returning id into target_workspace_id;

  return target_workspace_id;
end;
$$;

revoke all
on function public.request_workspace_review_again(text, text)
from public;

grant execute
on function public.request_workspace_review_again(text, text)
to authenticated;
