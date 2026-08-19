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

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete restrict,
  target_user_id uuid not null,
  action text not null check (action in ('coach_approved', 'coach_rejected', 'coach_package_changed', 'coach_paused', 'coach_resumed', 'coach_deleted')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_log_target_created_idx on public.admin_audit_log(target_user_id, created_at desc);
alter table public.admin_audit_log enable row level security;
grant select on public.admin_audit_log to authenticated;
create policy admin_audit_log_super_admin_select on public.admin_audit_log for select to authenticated using (private.is_super_admin());

create or replace function public.review_coach_application(
  target_user_id uuid, requested_status public.workspace_approval_status,
  requested_package public.coach_package default null,
  workspace_limit integer default null, active_user_limit integer default null,
  workout_template_limit integer default null, diet_template_limit integer default null,
  photo_retention_days integer default null, requested_note text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare reviewer_id uuid := auth.uid(); limits integer[]; previous_status public.workspace_approval_status; previous_package public.coach_package;
begin
  if not private.is_super_admin() then raise exception using errcode = '42501', message = 'Super admin required'; end if;
  if requested_status not in ('approved', 'rejected') then raise exception using errcode = '22023', message = 'Invalid review status'; end if;
  if char_length(coalesce(requested_note, '')) > 1000 then raise exception using errcode = '22023', message = 'Review note is too long'; end if;
  select approval_status, package into previous_status, previous_package from public.coach_accounts where user_id = target_user_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Coach application not found'; end if;
  if requested_status = 'approved' then
    if requested_package = 'basic' then limits := array[3, 50, 100, 100, 200];
    elsif requested_package = 'pro' then limits := array[10, 100, 200, 200, 360];
    elsif requested_package = 'custom' then limits := array[workspace_limit, active_user_limit, workout_template_limit, diet_template_limit, photo_retention_days];
    else raise exception using errcode = '22023', message = 'Package is required'; end if;
    if limits[1] not between 1 and 100 or limits[2] not between 1 and 10000 or limits[3] not between 1 and 10000 or limits[4] not between 1 and 10000 or limits[5] not between 1 and 3650 then raise exception using errcode = '22023', message = 'Invalid package limits'; end if;
    update public.coach_accounts set approval_status = 'approved', package = requested_package,
      maximum_workspace_creation = limits[1], maximum_active_user_allowed_in_one_workspace = limits[2],
      maximum_workout_template_creation = limits[3], maximum_diet_template_creation = limits[4],
      no_of_days_to_keep_user_photo_data = limits[5], review_note = null, reviewed_at = now(), reviewed_by = reviewer_id, updated_at = now()
    where user_id = target_user_id;
    insert into public.admin_audit_log(admin_id, target_user_id, action, metadata) values (
      reviewer_id, target_user_id,
      case when previous_status = 'approved' then 'coach_package_changed' else 'coach_approved' end,
      jsonb_build_object('previous_package', previous_package, 'package', requested_package, 'limits', limits)
    );
  else
    update public.coach_accounts set approval_status = 'rejected', package = null, review_note = coalesce(nullif(btrim(requested_note), ''), 'Rejected by platform review.'), reviewed_at = now(), reviewed_by = reviewer_id, updated_at = now() where user_id = target_user_id;
    insert into public.admin_audit_log(admin_id, target_user_id, action, metadata) values (reviewer_id, target_user_id, 'coach_rejected', jsonb_build_object('note', requested_note));
  end if;
end;
$$;

create or replace function public.set_coach_paused(target_user_id uuid, requested_paused boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_super_admin() then raise exception using errcode = '42501', message = 'Super admin required'; end if;
  if exists (select 1 from public.super_admins where user_id = target_user_id) then raise exception using errcode = '42501', message = 'Super admin accounts cannot be paused'; end if;
  update public.coach_accounts set is_paused = requested_paused, paused_at = case when requested_paused then now() else null end, paused_by = case when requested_paused then auth.uid() else null end, updated_at = now()
  where user_id = target_user_id and approval_status = 'approved';
  if not found then raise exception using errcode = 'P0002', message = 'Approved coach not found'; end if;
  insert into public.admin_audit_log(admin_id, target_user_id, action) values (auth.uid(), target_user_id, case when requested_paused then 'coach_paused' else 'coach_resumed' end);
end;
$$;

create or replace function public.delete_coach_account(target_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare coach_label text;
begin
  if not private.is_super_admin() then raise exception using errcode = '42501', message = 'Super admin required'; end if;
  if target_user_id = auth.uid() or exists (select 1 from public.super_admins where user_id = target_user_id) then raise exception using errcode = '42501', message = 'Super admin accounts cannot be deleted'; end if;
  select full_name into coach_label from public.profiles where id = target_user_id;
  if not exists (select 1 from public.coach_accounts where user_id = target_user_id) then raise exception using errcode = 'P0002', message = 'Coach account not found'; end if;
  insert into public.admin_audit_log(admin_id, target_user_id, action, metadata) values (auth.uid(), target_user_id, 'coach_deleted', jsonb_build_object('coach_name', coach_label));
  delete from public.workspaces where owner_id = target_user_id;
  delete from auth.users where id = target_user_id;
end;
$$;

create or replace function public.get_super_admin_coach_detail(target_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb; requested_user_id uuid := target_user_id;
begin
  if not private.is_super_admin() then raise exception using errcode = '42501', message = 'Super admin required'; end if;
  if not exists (select 1 from public.coach_accounts where user_id = requested_user_id) then raise exception using errcode = 'P0002', message = 'Coach account not found'; end if;

  select jsonb_build_object(
    'coach', (select jsonb_build_object(
      'id', account.user_id, 'name', profile.full_name, 'email', auth_user.email,
      'createdAt', account.created_at, 'lastSignInAt', auth_user.last_sign_in_at,
      'status', account.approval_status, 'package', account.package, 'paused', account.is_paused,
      'reviewedAt', account.reviewed_at, 'workspaceLimit', account.maximum_workspace_creation,
      'activeUserLimit', account.maximum_active_user_allowed_in_one_workspace,
      'workoutTemplateLimit', account.maximum_workout_template_creation,
      'dietTemplateLimit', account.maximum_diet_template_creation,
      'photoRetentionDays', account.no_of_days_to_keep_user_photo_data
    ) from public.coach_accounts account join auth.users auth_user on auth_user.id = account.user_id left join public.profiles profile on profile.id = account.user_id where account.user_id = requested_user_id),
    'workspaces', coalesce((select jsonb_agg(jsonb_build_object(
      'id', workspace.id, 'name', workspace.name, 'createdAt', workspace.created_at,
      'totalClients', (select count(*) from public.clients client where client.workspace_id = workspace.id),
      'activeClients', (select count(*) from public.clients client where client.workspace_id = workspace.id and client.status = 'active'),
      'workoutTemplates', (select count(*) from public.workout_plans plan where plan.workspace_id = workspace.id and plan.is_template),
      'dietTemplates', (select count(*) from public.nutrition_plans plan where plan.workspace_id = workspace.id and plan.is_template),
      'checkIns', (select count(*) from public.check_ins check_in where check_in.workspace_id = workspace.id),
      'lastActivityAt', (select max(activity_at) from (select max(client.updated_at) activity_at from public.clients client where client.workspace_id = workspace.id union all select max(check_in.updated_at) from public.check_ins check_in where check_in.workspace_id = workspace.id union all select max(plan.updated_at) from public.workout_plans plan where plan.workspace_id = workspace.id union all select max(plan.updated_at) from public.nutrition_plans plan where plan.workspace_id = workspace.id) activity)
    ) order by workspace.created_at desc) from public.workspaces workspace where workspace.owner_id = requested_user_id and not workspace.is_demo), '[]'::jsonb),
    'clients', coalesce((select jsonb_agg(jsonb_build_object(
      'id', client.id, 'workspaceId', client.workspace_id, 'workspaceName', workspace.name,
      'name', btrim(client.first_name || ' ' || client.last_name), 'email', client.email, 'phone', client.phone,
      'status', client.status, 'joinedAt', client.created_at, 'lastSignInAt', auth_user.last_sign_in_at,
      'checkInCount', (select count(*) from public.check_ins check_in where check_in.client_id = client.id),
      'lastCheckInAt', (select max(check_in.submitted_at) from public.check_ins check_in where check_in.client_id = client.id),
      'hasWorkoutPlan', exists(select 1 from public.workout_plan_assignments assignment where assignment.client_id = client.id and assignment.status = 'active'),
      'hasDietPlan', exists(select 1 from public.nutrition_plan_assignments assignment where assignment.client_id = client.id and assignment.status = 'active')
    ) order by client.created_at desc) from public.clients client join public.workspaces workspace on workspace.id = client.workspace_id left join auth.users auth_user on auth_user.id = client.user_id where workspace.owner_id = requested_user_id), '[]'::jsonb),
    'plans', coalesce((select jsonb_agg(plan_record order by (plan_record->>'updatedAt')::timestamptz desc) from (
      select jsonb_build_object('id', plan.id, 'workspaceName', workspace.name, 'name', plan.name, 'type', 'Workout', 'status', plan.status, 'isTemplate', plan.is_template, 'updatedAt', plan.updated_at) plan_record from public.workout_plans plan join public.workspaces workspace on workspace.id = plan.workspace_id where workspace.owner_id = requested_user_id
      union all
      select jsonb_build_object('id', plan.id, 'workspaceName', workspace.name, 'name', plan.name, 'type', 'Diet', 'status', plan.status, 'isTemplate', plan.is_template, 'updatedAt', plan.updated_at) from public.nutrition_plans plan join public.workspaces workspace on workspace.id = plan.workspace_id where workspace.owner_id = requested_user_id
    ) plans), '[]'::jsonb),
    'audit', coalesce((select jsonb_agg(jsonb_build_object('id', audit.id, 'action', audit.action, 'createdAt', audit.created_at, 'adminName', profile.full_name, 'metadata', audit.metadata) order by audit.created_at desc) from public.admin_audit_log audit left join public.profiles profile on profile.id = audit.admin_id where audit.target_user_id = requested_user_id), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

grant execute on function public.get_super_admin_coach_detail(uuid) to authenticated;

create or replace function public.get_super_admin_coach_overview()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if not private.is_super_admin() then raise exception using errcode = '42501', message = 'Super admin required'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', account.user_id, 'name', profile.full_name, 'email', auth_user.email,
    'package', account.package, 'paused', account.is_paused, 'reviewedAt', account.reviewed_at,
    'lastSignInAt', auth_user.last_sign_in_at,
    'workspaceCount', (select count(*) from public.workspaces workspace where workspace.owner_id = account.user_id and not workspace.is_demo),
    'totalClients', (select count(*) from public.clients client join public.workspaces workspace on workspace.id = client.workspace_id where workspace.owner_id = account.user_id),
    'activeClients', (select count(*) from public.clients client join public.workspaces workspace on workspace.id = client.workspace_id where workspace.owner_id = account.user_id and client.status = 'active'),
    'checkIns', (select count(*) from public.check_ins check_in join public.workspaces workspace on workspace.id = check_in.workspace_id where workspace.owner_id = account.user_id),
    'lastActivityAt', (select max(activity_at) from (
      select max(client.updated_at) activity_at from public.clients client join public.workspaces workspace on workspace.id = client.workspace_id where workspace.owner_id = account.user_id
      union all select max(check_in.updated_at) from public.check_ins check_in join public.workspaces workspace on workspace.id = check_in.workspace_id where workspace.owner_id = account.user_id
      union all select max(plan.updated_at) from public.workout_plans plan join public.workspaces workspace on workspace.id = plan.workspace_id where workspace.owner_id = account.user_id
      union all select max(plan.updated_at) from public.nutrition_plans plan join public.workspaces workspace on workspace.id = plan.workspace_id where workspace.owner_id = account.user_id
    ) activity),
    'limits', jsonb_build_object('workspaces', account.maximum_workspace_creation, 'activeUsers', account.maximum_active_user_allowed_in_one_workspace, 'workoutTemplates', account.maximum_workout_template_creation, 'dietTemplates', account.maximum_diet_template_creation, 'photoDays', account.no_of_days_to_keep_user_photo_data)
  ) order by account.created_at desc), '[]'::jsonb) into result
  from public.coach_accounts account join auth.users auth_user on auth_user.id = account.user_id left join public.profiles profile on profile.id = account.user_id
  where account.approval_status = 'approved';
  return result;
end;
$$;

grant execute on function public.get_super_admin_coach_overview() to authenticated;
