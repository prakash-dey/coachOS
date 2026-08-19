alter table public.coach_accounts
  add column is_paused boolean not null default false,
  add column paused_at timestamptz,
  add column paused_by uuid references auth.users(id) on delete set null,
  add constraint coach_accounts_pause_state check (
    (is_paused and paused_at is not null) or (not is_paused and paused_at is null)
  );

create index coach_accounts_active_idx on public.coach_accounts(is_paused, created_at desc)
where approval_status = 'approved';

create or replace function private.coach_is_approved(target_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.coach_accounts
    where user_id = target_user_id and approval_status = 'approved' and not is_paused
  );
$$;

create or replace function private.is_workspace_owner(target_workspace_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspaces workspace
    where workspace.id = target_workspace_id
      and workspace.owner_id = (select auth.uid())
      and (
        workspace.is_demo
        or (
          workspace.approval_status = 'approved'
          and private.coach_is_approved(workspace.owner_id)
        )
      )
  );
$$;

create or replace function public.set_coach_paused(target_user_id uuid, requested_paused boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_super_admin() then raise exception using errcode = '42501', message = 'Super admin required'; end if;
  if exists (select 1 from public.super_admins where user_id = target_user_id) then
    raise exception using errcode = '42501', message = 'Super admin accounts cannot be paused';
  end if;
  update public.coach_accounts
  set is_paused = requested_paused,
      paused_at = case when requested_paused then now() else null end,
      paused_by = case when requested_paused then auth.uid() else null end,
      updated_at = now()
  where user_id = target_user_id and approval_status = 'approved';
  if not found then raise exception using errcode = 'P0002', message = 'Approved coach not found'; end if;
end;
$$;

create or replace function public.delete_coach_account(target_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_super_admin() then raise exception using errcode = '42501', message = 'Super admin required'; end if;
  if target_user_id = auth.uid() or exists (select 1 from public.super_admins where user_id = target_user_id) then
    raise exception using errcode = '42501', message = 'Super admin accounts cannot be deleted';
  end if;
  if not exists (select 1 from public.coach_accounts where user_id = target_user_id) then
    raise exception using errcode = 'P0002', message = 'Coach account not found';
  end if;
  delete from public.workspaces where owner_id = target_user_id;
  delete from auth.users where id = target_user_id;
end;
$$;

create or replace function public.create_coach_workspace(workspace_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := auth.uid(); created_workspace_id uuid; allowed_count integer;
begin
  if char_length(btrim(workspace_name)) not between 1 and 120 then raise exception using errcode = '22023', message = 'Invalid workspace name'; end if;
  select maximum_workspace_creation into allowed_count from public.coach_accounts where user_id = current_user_id and approval_status = 'approved' and not is_paused for update;
  if allowed_count is null then raise exception using errcode = '42501', message = 'Active coach approval required'; end if;
  if (select count(*) from public.workspaces where owner_id = current_user_id and not is_demo) >= allowed_count then raise exception using errcode = '23514', message = 'Workspace package limit reached'; end if;
  insert into public.workspaces(name, owner_id, approval_status) values (btrim(workspace_name), current_user_id, 'approved') returning id into created_workspace_id;
  insert into public.workspace_members(workspace_id, user_id, role, status) values (created_workspace_id, current_user_id, 'coach', 'active');
  return created_workspace_id;
end;
$$;

grant execute on function public.set_coach_paused(uuid, boolean), public.delete_coach_account(uuid) to authenticated;
