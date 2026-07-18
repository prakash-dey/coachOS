create or replace function public.create_workout_plan(
  requested_name text,
  requested_description text default null
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

  if char_length(btrim(coalesce(requested_name, ''))) not between 1 and 120 then
    raise exception using errcode = '22023', message = 'Invalid workout plan name';
  end if;

  if requested_description is not null
    and char_length(btrim(requested_description)) > 5000 then
    raise exception using errcode = '22023', message = 'Invalid workout plan description';
  end if;

  select workspace.id
  into owned_workspace_id
  from public.workspaces as workspace
  where workspace.owner_id = current_user_id;

  if owned_workspace_id is null then
    raise exception using errcode = '42501', message = 'Coach workspace required';
  end if;

  insert into public.workout_plans (
    workspace_id,
    name,
    description,
    created_by
  ) values (
    owned_workspace_id,
    btrim(requested_name),
    nullif(btrim(requested_description), ''),
    current_user_id
  )
  returning id into created_plan_id;

  return created_plan_id;
end;
$$;

create or replace function public.create_nutrition_plan(
  requested_name text,
  requested_description text default null,
  requested_daily_calories integer default null,
  requested_protein_grams integer default null,
  requested_carbs_grams integer default null,
  requested_fat_grams integer default null
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

  if char_length(btrim(coalesce(requested_name, ''))) not between 1 and 120 then
    raise exception using errcode = '22023', message = 'Invalid nutrition plan name';
  end if;

  select workspace.id
  into owned_workspace_id
  from public.workspaces as workspace
  where workspace.owner_id = current_user_id;

  if owned_workspace_id is null then
    raise exception using errcode = '42501', message = 'Coach workspace required';
  end if;

  insert into public.nutrition_plans (
    workspace_id,
    name,
    description,
    daily_calories,
    protein_grams,
    carbs_grams,
    fat_grams,
    created_by
  ) values (
    owned_workspace_id,
    btrim(requested_name),
    nullif(btrim(requested_description), ''),
    requested_daily_calories,
    requested_protein_grams,
    requested_carbs_grams,
    requested_fat_grams,
    current_user_id
  )
  returning id into created_plan_id;

  return created_plan_id;
end;
$$;

revoke all on function public.create_workout_plan(text, text) from public;
revoke all on function public.create_nutrition_plan(text, text, integer, integer, integer, integer) from public;

grant execute on function public.create_workout_plan(text, text) to authenticated;
grant execute on function public.create_nutrition_plan(text, text, integer, integer, integer, integer) to authenticated;
