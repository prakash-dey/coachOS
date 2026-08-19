create type public.coach_package as enum ('basic', 'pro', 'custom');

insert into public.super_admins(user_id)
select id from auth.users where lower(email) = 'grittaai.official@gmail.com'
on conflict (user_id) do nothing;

create table public.coach_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  approval_status public.workspace_approval_status not null default 'pending_review',
  package public.coach_package,
  maximum_workspace_creation integer check (maximum_workspace_creation between 1 and 100),
  maximum_active_user_allowed_in_one_workspace integer check (maximum_active_user_allowed_in_one_workspace between 1 and 10000),
  maximum_workout_template_creation integer check (maximum_workout_template_creation between 1 and 10000),
  maximum_diet_template_creation integer check (maximum_diet_template_creation between 1 and 10000),
  no_of_days_to_keep_user_photo_data integer check (no_of_days_to_keep_user_photo_data between 1 and 3650),
  review_note text check (review_note is null or char_length(review_note) <= 1000),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coach_accounts_approved_package check (
    approval_status <> 'approved' or (
      package is not null
      and maximum_workspace_creation is not null
      and maximum_active_user_allowed_in_one_workspace is not null
      and maximum_workout_template_creation is not null
      and maximum_diet_template_creation is not null
      and no_of_days_to_keep_user_photo_data is not null
    )
  )
);

create index coach_accounts_status_created_idx on public.coach_accounts(approval_status, created_at desc);

insert into public.coach_accounts (
  user_id, approval_status, package, maximum_workspace_creation,
  maximum_active_user_allowed_in_one_workspace, maximum_workout_template_creation,
  maximum_diet_template_creation, no_of_days_to_keep_user_photo_data, reviewed_at
)
select distinct owner_id, 'approved'::public.workspace_approval_status, 'basic'::public.coach_package, 3, 50, 100, 100, 200, now()
from public.workspaces
where not is_demo
on conflict (user_id) do nothing;

alter table public.workout_plans
  add column is_template boolean not null default true,
  add column source_template_id uuid references public.workout_plans(id) on delete set null,
  add column client_id uuid references public.clients(id) on delete cascade;

alter table public.nutrition_plans
  add column is_template boolean not null default true,
  add column source_template_id uuid references public.nutrition_plans(id) on delete set null,
  add column client_id uuid references public.clients(id) on delete cascade;

create index workout_plans_workspace_template_idx on public.workout_plans(workspace_id, is_template, updated_at desc);
create index nutrition_plans_workspace_template_idx on public.nutrition_plans(workspace_id, is_template, updated_at desc);

create or replace function private.coach_is_approved(target_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.coach_accounts
    where user_id = target_user_id and approval_status = 'approved'
  );
$$;

create or replace function public.submit_coach_application(full_name text)
returns void language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if char_length(btrim(full_name)) not between 1 and 120 then raise exception using errcode = '22023', message = 'Invalid full name'; end if;
  insert into public.profiles(id, full_name) values (current_user_id, btrim(full_name))
  on conflict (id) do update set full_name = excluded.full_name;
  insert into public.coach_accounts(user_id) values (current_user_id)
  on conflict (user_id) do update set approval_status = 'pending_review', review_note = null, reviewed_at = null, reviewed_by = null;
end;
$$;

create or replace function public.review_coach_application(
  target_user_id uuid, requested_status public.workspace_approval_status,
  requested_package public.coach_package default null,
  workspace_limit integer default null, active_user_limit integer default null,
  workout_template_limit integer default null, diet_template_limit integer default null,
  photo_retention_days integer default null, requested_note text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare reviewer_id uuid := auth.uid(); limits integer[];
begin
  if not private.is_super_admin() then raise exception using errcode = '42501', message = 'Super admin required'; end if;
  if requested_status not in ('approved', 'rejected') then raise exception using errcode = '22023', message = 'Invalid review status'; end if;
  if char_length(coalesce(requested_note, '')) > 1000 then raise exception using errcode = '22023', message = 'Review note is too long'; end if;
  if requested_status = 'approved' then
    if requested_package = 'basic' then limits := array[3, 50, 100, 100, 200];
    elsif requested_package = 'pro' then limits := array[10, 100, 200, 200, 360];
    elsif requested_package = 'custom' then limits := array[workspace_limit, active_user_limit, workout_template_limit, diet_template_limit, photo_retention_days];
    else raise exception using errcode = '22023', message = 'Package is required'; end if;
    if limits[1] not between 1 and 100 or limits[2] not between 1 and 10000 or limits[3] not between 1 and 10000 or limits[4] not between 1 and 10000 or limits[5] not between 1 and 3650 then
      raise exception using errcode = '22023', message = 'Invalid package limits';
    end if;
    update public.coach_accounts set approval_status = 'approved', package = requested_package,
      maximum_workspace_creation = limits[1], maximum_active_user_allowed_in_one_workspace = limits[2],
      maximum_workout_template_creation = limits[3], maximum_diet_template_creation = limits[4],
      no_of_days_to_keep_user_photo_data = limits[5], review_note = null, reviewed_at = now(), reviewed_by = reviewer_id
    where user_id = target_user_id;
  else
    update public.coach_accounts set approval_status = 'rejected', package = null, review_note = coalesce(nullif(btrim(requested_note), ''), 'Rejected by platform review.'), reviewed_at = now(), reviewed_by = reviewer_id where user_id = target_user_id;
  end if;
  if not found then raise exception using errcode = 'P0002', message = 'Coach application not found'; end if;
end;
$$;

create or replace function public.create_coach_workspace(workspace_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := auth.uid(); created_workspace_id uuid; allowed_count integer;
begin
  if char_length(btrim(workspace_name)) not between 1 and 120 then raise exception using errcode = '22023', message = 'Invalid workspace name'; end if;
  select maximum_workspace_creation into allowed_count from public.coach_accounts where user_id = current_user_id and approval_status = 'approved' for update;
  if allowed_count is null then raise exception using errcode = '42501', message = 'Coach approval required'; end if;
  if (select count(*) from public.workspaces where owner_id = current_user_id and not is_demo) >= allowed_count then raise exception using errcode = '23514', message = 'Workspace package limit reached'; end if;
  insert into public.workspaces(name, owner_id, approval_status) values (btrim(workspace_name), current_user_id, 'approved') returning id into created_workspace_id;
  insert into public.workspace_members(workspace_id, user_id, role, status) values (created_workspace_id, current_user_id, 'coach', 'active');
  return created_workspace_id;
end;
$$;

create or replace function private.enforce_coach_resource_limits()
returns trigger language plpgsql security definer set search_path = '' as $$
declare owner_user_id uuid; allowed_count integer; used_count integer;
begin
  select owner_id into owner_user_id from public.workspaces where id = new.workspace_id;
  perform pg_advisory_xact_lock(hashtextextended(owner_user_id::text || ':' || tg_table_name, 0));
  if tg_table_name = 'clients' and new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    select maximum_active_user_allowed_in_one_workspace into allowed_count from public.coach_accounts where user_id = owner_user_id;
    select count(*) into used_count from public.clients where workspace_id = new.workspace_id and status = 'active' and (tg_op = 'INSERT' or id <> new.id);
  elsif tg_table_name = 'workout_plans' and new.is_template and (tg_op = 'INSERT' or not old.is_template) then
    select maximum_workout_template_creation into allowed_count from public.coach_accounts where user_id = owner_user_id;
    select count(*) into used_count from public.workout_plans p join public.workspaces w on w.id = p.workspace_id where w.owner_id = owner_user_id and p.is_template and (tg_op = 'INSERT' or p.id <> new.id);
  elsif tg_table_name = 'nutrition_plans' and new.is_template and (tg_op = 'INSERT' or not old.is_template) then
    select maximum_diet_template_creation into allowed_count from public.coach_accounts where user_id = owner_user_id;
    select count(*) into used_count from public.nutrition_plans p join public.workspaces w on w.id = p.workspace_id where w.owner_id = owner_user_id and p.is_template and (tg_op = 'INSERT' or p.id <> new.id);
  else return new; end if;
  if allowed_count is not null and used_count >= allowed_count then raise exception using errcode = '23514', message = 'Package resource limit reached'; end if;
  return new;
end;
$$;

create trigger clients_enforce_package_limit before insert or update of status on public.clients for each row execute function private.enforce_coach_resource_limits();
create trigger workout_plans_enforce_package_limit before insert or update of is_template on public.workout_plans for each row execute function private.enforce_coach_resource_limits();
create trigger nutrition_plans_enforce_package_limit before insert or update of is_template on public.nutrition_plans for each row execute function private.enforce_coach_resource_limits();

alter table public.coach_accounts enable row level security;
grant select on public.coach_accounts to authenticated;
grant execute on function public.submit_coach_application(text), public.create_coach_workspace(text) to authenticated;
grant execute on function public.review_coach_application(uuid, public.workspace_approval_status, public.coach_package, integer, integer, integer, integer, integer, text) to authenticated;
create policy coach_accounts_select on public.coach_accounts for select to authenticated using (user_id = auth.uid() or private.is_super_admin());
create policy coach_accounts_admin_update on public.coach_accounts for update to authenticated using (private.is_super_admin()) with check (private.is_super_admin());
create policy profiles_select_super_admin on public.profiles for select to authenticated using (private.is_super_admin());

create or replace function public.assign_workout_template(target_template_id uuid, target_client_id uuid, starts_on date)
returns uuid language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := auth.uid(); template public.workout_plans%rowtype; copied_plan_id uuid; source_day record; copied_day_id uuid; ends_on date;
begin
  select * into template from public.workout_plans where id = target_template_id and is_template and status = 'active' and private.is_workspace_owner(workspace_id);
  if not found or not exists (select 1 from public.clients where id = target_client_id and workspace_id = template.workspace_id and status <> 'archived') then raise exception using errcode = '42501', message = 'Template or client not available'; end if;
  insert into public.workout_plans(workspace_id, name, description, status, created_by, duration_weeks, is_template, source_template_id, client_id)
  values(template.workspace_id, template.name, template.description, 'active', current_user_id, template.duration_weeks, false, template.id, target_client_id) returning id into copied_plan_id;
  for source_day in select * from public.workout_days where workout_plan_id = template.id order by position loop
    insert into public.workout_days(workout_plan_id, position, name, notes) values(copied_plan_id, source_day.position, source_day.name, source_day.notes) returning id into copied_day_id;
    insert into public.workout_exercises(workout_day_id, position, name, sets, reps, rest_seconds, tempo, target_load, notes, demo_url)
    select copied_day_id, position, name, sets, reps, rest_seconds, tempo, target_load, notes, demo_url from public.workout_exercises where workout_day_id = source_day.id;
  end loop;
  update public.workout_plan_assignments a set status = 'cancelled' from public.workout_plans p where a.workout_plan_id = p.id and a.client_id = target_client_id and a.status = 'active' and p.source_template_id = template.id;
  ends_on := starts_on + (template.duration_weeks * 7 - 1);
  insert into public.workout_plan_assignments(workspace_id, client_id, workout_plan_id, assigned_by, starts_on, ends_on) values(template.workspace_id, target_client_id, copied_plan_id, current_user_id, starts_on, ends_on);
  return copied_plan_id;
end;
$$;

create or replace function public.assign_nutrition_template(target_template_id uuid, target_client_id uuid, starts_on date)
returns uuid language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := auth.uid(); template public.nutrition_plans%rowtype; copied_plan_id uuid; source_meal record; copied_meal_id uuid; ends_on date;
begin
  select * into template from public.nutrition_plans where id = target_template_id and is_template and status = 'active' and private.is_workspace_owner(workspace_id);
  if not found or not exists (select 1 from public.clients where id = target_client_id and workspace_id = template.workspace_id and status <> 'archived') then raise exception using errcode = '42501', message = 'Template or client not available'; end if;
  insert into public.nutrition_plans(workspace_id, name, description, daily_calories, protein_grams, carbs_grams, fat_grams, status, created_by, duration_weeks, fiber_grams, water_liters, dietary_preference, allergies, foods_to_avoid, is_template, source_template_id, client_id)
  values(template.workspace_id, template.name, template.description, template.daily_calories, template.protein_grams, template.carbs_grams, template.fat_grams, 'active', current_user_id, template.duration_weeks, template.fiber_grams, template.water_liters, template.dietary_preference, template.allergies, template.foods_to_avoid, false, template.id, target_client_id) returning id into copied_plan_id;
  for source_meal in select * from public.nutrition_meals where nutrition_plan_id = template.id order by position loop
    insert into public.nutrition_meals(nutrition_plan_id, position, name, timing, notes) values(copied_plan_id, source_meal.position, source_meal.name, source_meal.timing, source_meal.notes) returning id into copied_meal_id;
    insert into public.nutrition_items(nutrition_meal_id, position, name, amount, alternatives, calories, protein_grams, carbs_grams, fat_grams)
    select copied_meal_id, position, name, amount, alternatives, calories, protein_grams, carbs_grams, fat_grams from public.nutrition_items where nutrition_meal_id = source_meal.id;
  end loop;
  update public.nutrition_plan_assignments a set status = 'cancelled' from public.nutrition_plans p where a.nutrition_plan_id = p.id and a.client_id = target_client_id and a.status = 'active' and p.source_template_id = template.id;
  ends_on := starts_on + (template.duration_weeks * 7 - 1);
  insert into public.nutrition_plan_assignments(workspace_id, client_id, nutrition_plan_id, assigned_by, starts_on, ends_on) values(template.workspace_id, target_client_id, copied_plan_id, current_user_id, starts_on, ends_on);
  return copied_plan_id;
end;
$$;

grant execute on function public.assign_workout_template(uuid, uuid, date), public.assign_nutrition_template(uuid, uuid, date) to authenticated;

create or replace function private.purge_expired_coach_photos()
returns bigint language plpgsql security definer set search_path = '' as $$
declare removed_count bigint;
begin
  with removed as (
    delete from storage.objects object
    using public.workspaces workspace, public.coach_accounts account
    where object.bucket_id in ('client-onboarding-photos', 'check-in-photos')
      and split_part(object.name, '/', 1) = workspace.id::text
      and account.user_id = workspace.owner_id
      and object.created_at < now() - make_interval(days => account.no_of_days_to_keep_user_photo_data)
    returning object.id
  ) select count(*) into removed_count from removed;
  return removed_count;
end;
$$;

revoke all on function private.purge_expired_coach_photos() from public, authenticated;
grant execute on function private.purge_expired_coach_photos() to service_role;

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule(
  'coach-photo-retention-nightly',
  '0 2 * * *',
  'select private.purge_expired_coach_photos()'
);
