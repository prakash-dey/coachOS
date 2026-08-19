create or replace function private.is_active_workspace_member(target_workspace_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.workspace_members member
    join public.workspaces workspace on workspace.id = member.workspace_id
    where member.workspace_id = target_workspace_id
      and member.user_id = (select auth.uid())
      and member.status = 'active'
      and (workspace.is_demo or workspace.approval_status = 'approved')
  );
$$;

create or replace function private.is_nutrition_plan_owner(target_plan_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.nutrition_plans plan
    where plan.id = target_plan_id and private.is_workspace_owner(plan.workspace_id)
  );
$$;

create or replace function private.is_workout_plan_owner(target_plan_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workout_plans plan
    where plan.id = target_plan_id and private.is_workspace_owner(plan.workspace_id)
  );
$$;
