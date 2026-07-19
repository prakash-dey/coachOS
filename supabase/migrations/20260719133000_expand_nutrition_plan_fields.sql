alter table public.nutrition_plans
add column fiber_grams integer default 30 check (fiber_grams is null or fiber_grams between 0 and 200),
add column water_liters numeric(4,1) default 3.0 check (water_liters is null or water_liters between 0 and 20),
add column dietary_preference text default 'Flexible' check (dietary_preference is null or char_length(btrim(dietary_preference)) between 1 and 120),
add column allergies text default 'None reported' check (allergies is null or char_length(btrim(allergies)) between 1 and 1000),
add column foods_to_avoid text default 'None specified' check (foods_to_avoid is null or char_length(btrim(foods_to_avoid)) between 1 and 1000);

alter table public.nutrition_items
add column calories integer default 250 check (calories is null or calories between 0 and 5000),
add column protein_grams integer default 20 check (protein_grams is null or protein_grams between 0 and 500),
add column carbs_grams integer default 30 check (carbs_grams is null or carbs_grams between 0 and 800),
add column fat_grams integer default 8 check (fat_grams is null or fat_grams between 0 and 300);

grant insert (fiber_grams, water_liters, dietary_preference, allergies, foods_to_avoid),
  update (fiber_grams, water_liters, dietary_preference, allergies, foods_to_avoid)
on public.nutrition_plans to authenticated;

grant insert (calories, protein_grams, carbs_grams, fat_grams),
  update (calories, protein_grams, carbs_grams, fat_grams)
on public.nutrition_items to authenticated;

drop function public.create_nutrition_plan(text, text, integer, integer, integer, integer, integer);

create function public.create_nutrition_plan(
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
