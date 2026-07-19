alter table public.workout_plans
add column duration_weeks smallint not null default 12
check (duration_weeks between 1 and 104);

alter table public.nutrition_plans
add column duration_weeks smallint not null default 12
check (duration_weeks between 1 and 104);

update public.workout_plan_assignments as assignment
set ends_on = assignment.starts_on + (plan.duration_weeks * 7 - 1)
from public.workout_plans as plan
where plan.id = assignment.workout_plan_id and assignment.ends_on is null;

update public.nutrition_plan_assignments as assignment
set ends_on = assignment.starts_on + (plan.duration_weeks * 7 - 1)
from public.nutrition_plans as plan
where plan.id = assignment.nutrition_plan_id and assignment.ends_on is null;

alter table public.workout_plan_assignments alter column ends_on set default (current_date + 83);
alter table public.workout_plan_assignments alter column ends_on set not null;
alter table public.nutrition_plan_assignments alter column ends_on set default (current_date + 83);
alter table public.nutrition_plan_assignments alter column ends_on set not null;

create or replace function private.can_access_workout_plan(target_plan_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_workout_plan_owner(target_plan_id) or exists (
    select 1 from public.workout_plan_assignments a
    join public.clients c on c.id = a.client_id and c.workspace_id = a.workspace_id
    where a.workout_plan_id = target_plan_id and a.status = 'active'
      and current_date between a.starts_on and a.ends_on
      and c.status = 'active' and c.user_id = (select auth.uid())
      and private.is_active_workspace_member(a.workspace_id)
  );
$$;

create or replace function private.can_access_nutrition_plan(target_plan_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_nutrition_plan_owner(target_plan_id) or exists (
    select 1 from public.nutrition_plan_assignments a
    join public.clients c on c.id = a.client_id and c.workspace_id = a.workspace_id
    where a.nutrition_plan_id = target_plan_id and a.status = 'active'
      and current_date between a.starts_on and a.ends_on
      and c.status = 'active' and c.user_id = (select auth.uid())
      and private.is_active_workspace_member(a.workspace_id)
  );
$$;

grant update (duration_weeks) on public.workout_plans to authenticated;
grant update (duration_weeks) on public.nutrition_plans to authenticated;

drop function public.create_workout_plan(text, text);
drop function public.create_nutrition_plan(text, text, integer, integer, integer, integer);

create function public.create_workout_plan(
  requested_name text,
  requested_description text,
  requested_duration_weeks integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  owned_workspace_id uuid;
  created_plan_id uuid;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if char_length(btrim(coalesce(requested_name, ''))) not between 1 and 120
    or requested_duration_weeks not between 1 and 104 then
    raise exception using errcode = '22023', message = 'Invalid workout plan';
  end if;
  if requested_description is not null and char_length(btrim(requested_description)) > 5000 then
    raise exception using errcode = '22023', message = 'Invalid workout plan description';
  end if;

  select id into owned_workspace_id
  from public.workspaces
  where owner_id = current_user_id;
  if owned_workspace_id is null then
    raise exception using errcode = '42501', message = 'Coach workspace required';
  end if;

  insert into public.workout_plans (workspace_id, name, description, duration_weeks, created_by)
  values (owned_workspace_id, btrim(requested_name), nullif(btrim(requested_description), ''), requested_duration_weeks, current_user_id)
  returning id into created_plan_id;
  return created_plan_id;
end;
$$;

create function public.create_nutrition_plan(
  requested_name text,
  requested_description text,
  requested_daily_calories integer,
  requested_protein_grams integer,
  requested_carbs_grams integer,
  requested_fat_grams integer,
  requested_duration_weeks integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  owned_workspace_id uuid;
  created_plan_id uuid;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if char_length(btrim(coalesce(requested_name, ''))) not between 1 and 120
    or requested_duration_weeks not between 1 and 104 then
    raise exception using errcode = '22023', message = 'Invalid nutrition plan';
  end if;

  select id into owned_workspace_id from public.workspaces where owner_id = current_user_id;
  if owned_workspace_id is null then
    raise exception using errcode = '42501', message = 'Coach workspace required';
  end if;

  insert into public.nutrition_plans (
    workspace_id, name, description, daily_calories, protein_grams,
    carbs_grams, fat_grams, duration_weeks, created_by
  ) values (
    owned_workspace_id, btrim(requested_name), nullif(btrim(requested_description), ''),
    requested_daily_calories, requested_protein_grams, requested_carbs_grams,
    requested_fat_grams, requested_duration_weeks, current_user_id
  ) returning id into created_plan_id;
  return created_plan_id;
end;
$$;

create function public.set_client_status(target_client_id uuid, requested_status public.client_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_workspace_id uuid;
  target_user_id uuid;
begin
  select client.workspace_id, client.user_id
  into target_workspace_id, target_user_id
  from public.clients as client
  join public.workspaces as workspace on workspace.id = client.workspace_id
  where client.id = target_client_id and workspace.owner_id = current_user_id;
  if target_workspace_id is null then
    raise exception using errcode = '42501', message = 'Client not found';
  end if;

  update public.clients set status = requested_status where id = target_client_id;
  if target_user_id is not null then
    update public.workspace_members
    set status = case when requested_status = 'active' then 'active'::public.membership_status else 'suspended'::public.membership_status end
    where workspace_id = target_workspace_id and user_id = target_user_id and role = 'client';
  end if;
end;
$$;

create function public.delete_client(target_client_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_workspace_id uuid;
  target_user_id uuid;
begin
  select client.workspace_id, client.user_id
  into target_workspace_id, target_user_id
  from public.clients as client
  join public.workspaces as workspace on workspace.id = client.workspace_id
  where client.id = target_client_id and workspace.owner_id = current_user_id;
  if target_workspace_id is null then
    raise exception using errcode = '42501', message = 'Client not found';
  end if;

  delete from public.clients where id = target_client_id;
  if target_user_id is not null then
    delete from public.workspace_members
    where workspace_id = target_workspace_id and user_id = target_user_id and role = 'client';
  end if;
end;
$$;

revoke all on function public.create_workout_plan(text, text, integer) from public;
revoke all on function public.create_nutrition_plan(text, text, integer, integer, integer, integer, integer) from public;
revoke all on function public.set_client_status(uuid, public.client_status) from public;
revoke all on function public.delete_client(uuid) from public;

grant execute on function public.create_workout_plan(text, text, integer) to authenticated;
grant execute on function public.create_nutrition_plan(text, text, integer, integer, integer, integer, integer) to authenticated;
grant execute on function public.set_client_status(uuid, public.client_status) to authenticated;
grant execute on function public.delete_client(uuid) to authenticated;
