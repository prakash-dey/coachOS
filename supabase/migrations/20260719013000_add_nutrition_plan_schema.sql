create type public.nutrition_plan_status as enum ('draft', 'active', 'archived');
create type public.nutrition_assignment_status as enum ('active', 'completed', 'cancelled');

create table public.nutrition_plans (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  description text check (description is null or char_length(btrim(description)) between 1 and 5000),
  daily_calories integer check (daily_calories is null or daily_calories between 500 and 10000),
  protein_grams integer check (protein_grams is null or protein_grams between 0 and 1000),
  carbs_grams integer check (carbs_grams is null or carbs_grams between 0 and 1500),
  fat_grams integer check (fat_grams is null or fat_grams between 0 and 500),
  status public.nutrition_plan_status not null default 'draft',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id)
);

create table public.nutrition_meals (
  id uuid primary key default gen_random_uuid(),
  nutrition_plan_id uuid not null references public.nutrition_plans(id) on delete cascade,
  position smallint not null check (position between 1 and 20),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  timing text check (timing is null or char_length(btrim(timing)) between 1 and 80),
  notes text check (notes is null or char_length(btrim(notes)) between 1 and 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (nutrition_plan_id, position)
);

create table public.nutrition_items (
  id uuid primary key default gen_random_uuid(),
  nutrition_meal_id uuid not null references public.nutrition_meals(id) on delete cascade,
  position smallint not null check (position between 1 and 50),
  name text not null check (char_length(btrim(name)) between 1 and 160),
  amount text not null check (char_length(btrim(amount)) between 1 and 80),
  alternatives text check (alternatives is null or char_length(btrim(alternatives)) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (nutrition_meal_id, position)
);

create table public.nutrition_plan_assignments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null,
  nutrition_plan_id uuid not null,
  assigned_by uuid not null references auth.users(id) on delete restrict,
  status public.nutrition_assignment_status not null default 'active',
  starts_on date not null default current_date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete cascade,
  foreign key (workspace_id, nutrition_plan_id) references public.nutrition_plans(workspace_id, id) on delete cascade,
  check (ends_on is null or ends_on >= starts_on)
);

create unique index nutrition_assignments_one_active_idx on public.nutrition_plan_assignments(client_id, nutrition_plan_id) where status = 'active';
create index nutrition_plans_workspace_status_idx on public.nutrition_plans(workspace_id, status, updated_at desc);
create index nutrition_assignments_client_idx on public.nutrition_plan_assignments(client_id, status, starts_on desc);

create trigger nutrition_plans_set_updated_at before update on public.nutrition_plans for each row execute function private.set_updated_at();
create trigger nutrition_meals_set_updated_at before update on public.nutrition_meals for each row execute function private.set_updated_at();
create trigger nutrition_items_set_updated_at before update on public.nutrition_items for each row execute function private.set_updated_at();
create trigger nutrition_assignments_set_updated_at before update on public.nutrition_plan_assignments for each row execute function private.set_updated_at();

create function private.is_nutrition_plan_owner(target_plan_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.nutrition_plans p join public.workspaces w on w.id = p.workspace_id where p.id = target_plan_id and w.owner_id = (select auth.uid()));
$$;
create function private.can_access_nutrition_plan(target_plan_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_nutrition_plan_owner(target_plan_id) or exists (
    select 1 from public.nutrition_plan_assignments a join public.clients c on c.id = a.client_id and c.workspace_id = a.workspace_id
    where a.nutrition_plan_id = target_plan_id and a.status = 'active' and c.user_id = (select auth.uid()) and private.is_active_workspace_member(a.workspace_id)
  );
$$;
create function private.is_nutrition_meal_owner(target_meal_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.nutrition_meals m where m.id = target_meal_id and private.is_nutrition_plan_owner(m.nutrition_plan_id));
$$;
create function private.can_access_nutrition_meal(target_meal_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.nutrition_meals m where m.id = target_meal_id and private.can_access_nutrition_plan(m.nutrition_plan_id));
$$;

revoke all on function private.is_nutrition_plan_owner(uuid), private.can_access_nutrition_plan(uuid), private.is_nutrition_meal_owner(uuid), private.can_access_nutrition_meal(uuid) from public;
grant execute on function private.is_nutrition_plan_owner(uuid), private.can_access_nutrition_plan(uuid), private.is_nutrition_meal_owner(uuid), private.can_access_nutrition_meal(uuid) to authenticated;

alter table public.nutrition_plans enable row level security;
alter table public.nutrition_meals enable row level security;
alter table public.nutrition_items enable row level security;
alter table public.nutrition_plan_assignments enable row level security;
revoke all on public.nutrition_plans, public.nutrition_meals, public.nutrition_items, public.nutrition_plan_assignments from anon, authenticated;
grant select on public.nutrition_plans, public.nutrition_meals, public.nutrition_items, public.nutrition_plan_assignments to authenticated;
grant insert (workspace_id, name, description, daily_calories, protein_grams, carbs_grams, fat_grams, status, created_by), update (name, description, daily_calories, protein_grams, carbs_grams, fat_grams, status) on public.nutrition_plans to authenticated;
grant insert (nutrition_plan_id, position, name, timing, notes), update (position, name, timing, notes), delete on public.nutrition_meals to authenticated;
grant insert (nutrition_meal_id, position, name, amount, alternatives), update (position, name, amount, alternatives), delete on public.nutrition_items to authenticated;
grant insert (workspace_id, client_id, nutrition_plan_id, assigned_by, status, starts_on, ends_on), update (status, starts_on, ends_on) on public.nutrition_plan_assignments to authenticated;
grant usage on type public.nutrition_plan_status, public.nutrition_assignment_status to authenticated;

create policy nutrition_plans_select on public.nutrition_plans for select to authenticated using (private.can_access_nutrition_plan(id));
create policy nutrition_plans_insert on public.nutrition_plans for insert to authenticated with check (private.is_workspace_owner(workspace_id) and created_by = (select auth.uid()));
create policy nutrition_plans_update on public.nutrition_plans for update to authenticated using (private.is_workspace_owner(workspace_id)) with check (private.is_workspace_owner(workspace_id));
create policy nutrition_meals_select on public.nutrition_meals for select to authenticated using (private.can_access_nutrition_plan(nutrition_plan_id));
create policy nutrition_meals_insert on public.nutrition_meals for insert to authenticated with check (private.is_nutrition_plan_owner(nutrition_plan_id));
create policy nutrition_meals_update on public.nutrition_meals for update to authenticated using (private.is_nutrition_plan_owner(nutrition_plan_id)) with check (private.is_nutrition_plan_owner(nutrition_plan_id));
create policy nutrition_meals_delete on public.nutrition_meals for delete to authenticated using (private.is_nutrition_plan_owner(nutrition_plan_id));
create policy nutrition_items_select on public.nutrition_items for select to authenticated using (private.can_access_nutrition_meal(nutrition_meal_id));
create policy nutrition_items_insert on public.nutrition_items for insert to authenticated with check (private.is_nutrition_meal_owner(nutrition_meal_id));
create policy nutrition_items_update on public.nutrition_items for update to authenticated using (private.is_nutrition_meal_owner(nutrition_meal_id)) with check (private.is_nutrition_meal_owner(nutrition_meal_id));
create policy nutrition_items_delete on public.nutrition_items for delete to authenticated using (private.is_nutrition_meal_owner(nutrition_meal_id));
create policy nutrition_assignments_select on public.nutrition_plan_assignments for select to authenticated using (private.is_workspace_owner(workspace_id) or (private.is_active_workspace_member(workspace_id) and exists (select 1 from public.clients c where c.id = client_id and c.workspace_id = workspace_id and c.user_id = (select auth.uid()))));
create policy nutrition_assignments_insert on public.nutrition_plan_assignments for insert to authenticated with check (private.is_workspace_owner(workspace_id) and assigned_by = (select auth.uid()) and private.is_nutrition_plan_owner(nutrition_plan_id) and exists (select 1 from public.clients c where c.id = client_id and c.workspace_id = workspace_id and c.status <> 'archived'));
create policy nutrition_assignments_update on public.nutrition_plan_assignments for update to authenticated using (private.is_workspace_owner(workspace_id)) with check (private.is_workspace_owner(workspace_id));
