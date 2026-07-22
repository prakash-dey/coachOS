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
