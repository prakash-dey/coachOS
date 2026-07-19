alter table public.nutrition_plans
alter column fiber_grams set default 30,
alter column water_liters set default 3.0,
alter column dietary_preference set default 'Flexible',
alter column allergies set default 'None reported',
alter column foods_to_avoid set default 'None specified';

alter table public.nutrition_items
alter column calories set default 250,
alter column protein_grams set default 20,
alter column carbs_grams set default 30,
alter column fat_grams set default 8;

create or replace function public.create_nutrition_plan(
  requested_name text,
  requested_description text,
  requested_daily_calories integer,
  requested_protein_grams integer,
  requested_carbs_grams integer,
  requested_fat_grams integer,
  requested_duration_weeks integer,
  requested_fiber_grams integer,
  requested_water_liters numeric,
  requested_dietary_preference text,
  requested_allergies text,
  requested_foods_to_avoid text
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
  if char_length(coalesce(nullif(btrim(requested_name), ''), 'Balanced nutrition plan')) not between 1 and 120
    or coalesce(requested_duration_weeks, 12) not between 1 and 104 then
    raise exception using errcode = '22023', message = 'Invalid nutrition plan';
  end if;
  if requested_description is not null and char_length(btrim(requested_description)) > 5000 then
    raise exception using errcode = '22023', message = 'Invalid nutrition strategy';
  end if;

  select id into owned_workspace_id from public.workspaces where owner_id = current_user_id;
  if owned_workspace_id is null then
    raise exception using errcode = '42501', message = 'Coach workspace required';
  end if;

  insert into public.nutrition_plans (
    workspace_id, name, description, daily_calories, protein_grams,
    carbs_grams, fat_grams, duration_weeks, fiber_grams, water_liters,
    dietary_preference, allergies, foods_to_avoid, created_by
  ) values (
    owned_workspace_id,
    coalesce(nullif(btrim(requested_name), ''), 'Balanced nutrition plan'),
    coalesce(nullif(btrim(requested_description), ''), 'Balanced whole-food plan with flexible meal swaps.'),
    coalesce(nullif(requested_daily_calories, 0), 2200),
    coalesce(requested_protein_grams, 140),
    coalesce(requested_carbs_grams, 250),
    coalesce(requested_fat_grams, 70),
    coalesce(requested_duration_weeks, 12),
    coalesce(requested_fiber_grams, 30),
    coalesce(nullif(requested_water_liters, 0), 3.0),
    coalesce(nullif(btrim(requested_dietary_preference), ''), 'Flexible'),
    coalesce(nullif(btrim(requested_allergies), ''), 'None reported'),
    coalesce(nullif(btrim(requested_foods_to_avoid), ''), 'None specified'),
    current_user_id
  ) returning id into created_plan_id;
  return created_plan_id;
end;
$$;

revoke all on function public.create_nutrition_plan(text, text, integer, integer, integer, integer, integer, integer, numeric, text, text, text) from public;
grant execute on function public.create_nutrition_plan(text, text, integer, integer, integer, integer, integer, integer, numeric, text, text, text) to authenticated;
