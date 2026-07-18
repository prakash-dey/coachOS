-- =========================================================
-- ENUMS
-- =========================================================

create type public.workout_plan_status as enum (
  'draft',
  'active',
  'archived'
);

create type public.workout_assignment_status as enum (
  'active',
  'completed',
  'cancelled'
);


-- =========================================================
-- WORKOUT PLANS
-- =========================================================

create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),

  workspace_id uuid not null
    references public.workspaces (id)
    on delete cascade,

  name text not null,
  description text,

  status public.workout_plan_status not null
    default 'draft',

  created_by uuid not null
    references auth.users (id)
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint workout_plans_workspace_id_id_unique
    unique (workspace_id, id),

  constraint workout_plans_name_length
    check (char_length(btrim(name)) between 1 and 120),

  constraint workout_plans_description_length
    check (
      description is null
      or char_length(btrim(description)) between 1 and 5000
    )
);


-- =========================================================
-- WORKOUT DAYS
-- =========================================================

create table public.workout_days (
  id uuid primary key default gen_random_uuid(),

  workout_plan_id uuid not null
    references public.workout_plans (id)
    on delete cascade,

  position smallint not null,

  name text not null,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint workout_days_plan_position_unique
    unique (workout_plan_id, position),

  constraint workout_days_position_range
    check (position between 1 and 31),

  constraint workout_days_name_length
    check (char_length(btrim(name)) between 1 and 120),

  constraint workout_days_notes_length
    check (
      notes is null
      or char_length(btrim(notes)) between 1 and 3000
    )
);


-- =========================================================
-- WORKOUT EXERCISES
-- =========================================================

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),

  workout_day_id uuid not null
    references public.workout_days (id)
    on delete cascade,

  position smallint not null,

  name text not null,
  sets smallint not null,
  reps text not null,

  rest_seconds integer,
  tempo text,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint workout_exercises_day_position_unique
    unique (workout_day_id, position),

  constraint workout_exercises_position_range
    check (position between 1 and 100),

  constraint workout_exercises_name_length
    check (char_length(btrim(name)) between 1 and 160),

  constraint workout_exercises_sets_range
    check (sets between 1 and 20),

  constraint workout_exercises_reps_length
    check (char_length(btrim(reps)) between 1 and 50),

  constraint workout_exercises_rest_range
    check (
      rest_seconds is null
      or rest_seconds between 0 and 3600
    ),

  constraint workout_exercises_tempo_length
    check (
      tempo is null
      or char_length(btrim(tempo)) between 1 and 50
    ),

  constraint workout_exercises_notes_length
    check (
      notes is null
      or char_length(btrim(notes)) between 1 and 3000
    )
);


-- =========================================================
-- WORKOUT PLAN ASSIGNMENTS
-- =========================================================

create table public.workout_plan_assignments (
  id uuid primary key default gen_random_uuid(),

  workspace_id uuid not null,

  client_id uuid not null,

  workout_plan_id uuid not null,

  assigned_by uuid not null
    references auth.users (id)
    on delete restrict,

  status public.workout_assignment_status not null
    default 'active',

  starts_on date not null default current_date,
  ends_on date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint workout_assignments_workspace_fk
    foreign key (workspace_id)
    references public.workspaces (id)
    on delete cascade,

  constraint workout_assignments_client_workspace_fk
    foreign key (workspace_id, client_id)
    references public.clients (workspace_id, id)
    on delete cascade,

  constraint workout_assignments_plan_workspace_fk
    foreign key (workspace_id, workout_plan_id)
    references public.workout_plans (workspace_id, id)
    on delete cascade,

  constraint workout_assignments_date_range
    check (
      ends_on is null
      or ends_on >= starts_on
    )
);


-- =========================================================
-- INDEXES
-- =========================================================

create index workout_plans_workspace_status_idx
  on public.workout_plans (
    workspace_id,
    status,
    updated_at desc
  );

create index workout_days_plan_position_idx
  on public.workout_days (
    workout_plan_id,
    position
  );

create index workout_exercises_day_position_idx
  on public.workout_exercises (
    workout_day_id,
    position
  );

create index workout_assignments_client_status_idx
  on public.workout_plan_assignments (
    client_id,
    status,
    starts_on desc
  );

create index workout_assignments_plan_idx
  on public.workout_plan_assignments (
    workout_plan_id
  );

create unique index workout_assignments_one_active_plan_idx
  on public.workout_plan_assignments (
    client_id,
    workout_plan_id
  )
  where status = 'active';


-- =========================================================
-- UPDATED_AT TRIGGERS
-- =========================================================

create trigger workout_plans_set_updated_at
before update on public.workout_plans
for each row
execute function private.set_updated_at();

create trigger workout_days_set_updated_at
before update on public.workout_days
for each row
execute function private.set_updated_at();

create trigger workout_exercises_set_updated_at
before update on public.workout_exercises
for each row
execute function private.set_updated_at();

create trigger workout_assignments_set_updated_at
before update on public.workout_plan_assignments
for each row
execute function private.set_updated_at();


-- =========================================================
-- AUTHORIZATION HELPERS
-- =========================================================

create function private.is_workout_plan_owner(
  target_plan_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workout_plans as plan
    join public.workspaces as workspace
      on workspace.id = plan.workspace_id
    where plan.id = target_plan_id
      and workspace.owner_id = (select auth.uid())
  );
$$;


create function private.can_access_workout_plan(
  target_plan_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_workout_plan_owner(target_plan_id)
    or exists (
      select 1
      from public.workout_plan_assignments as assignment
      join public.clients as client
        on client.id = assignment.client_id
        and client.workspace_id = assignment.workspace_id
      join public.workspace_members as member
        on member.workspace_id = assignment.workspace_id
        and member.user_id = client.user_id
      where assignment.workout_plan_id = target_plan_id
        and assignment.status = 'active'
        and client.user_id = (select auth.uid())
        and member.role = 'client'
        and member.status = 'active'
    );
$$;


create function private.is_workout_day_owner(
  target_day_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workout_days as day
    where day.id = target_day_id
      and private.is_workout_plan_owner(day.workout_plan_id)
  );
$$;


create function private.can_access_workout_day(
  target_day_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workout_days as day
    where day.id = target_day_id
      and private.can_access_workout_plan(day.workout_plan_id)
  );
$$;


revoke all
on function private.is_workout_plan_owner(uuid)
from public;

revoke all
on function private.can_access_workout_plan(uuid)
from public;

revoke all
on function private.is_workout_day_owner(uuid)
from public;

revoke all
on function private.can_access_workout_day(uuid)
from public;

grant execute
on function private.is_workout_plan_owner(uuid)
to authenticated;

grant execute
on function private.can_access_workout_plan(uuid)
to authenticated;

grant execute
on function private.is_workout_day_owner(uuid)
to authenticated;

grant execute
on function private.can_access_workout_day(uuid)
to authenticated;


-- =========================================================
-- ENABLE RLS
-- =========================================================

alter table public.workout_plans
enable row level security;

alter table public.workout_days
enable row level security;

alter table public.workout_exercises
enable row level security;

alter table public.workout_plan_assignments
enable row level security;


-- =========================================================
-- PRIVILEGES
-- =========================================================

revoke all
on table public.workout_plans
from anon, authenticated;

revoke all
on table public.workout_days
from anon, authenticated;

revoke all
on table public.workout_exercises
from anon, authenticated;

revoke all
on table public.workout_plan_assignments
from anon, authenticated;


grant select
on table public.workout_plans
to authenticated;

grant insert (
  workspace_id,
  name,
  description,
  status,
  created_by
)
on public.workout_plans
to authenticated;

grant update (
  name,
  description,
  status
)
on public.workout_plans
to authenticated;


grant select
on table public.workout_days
to authenticated;

grant insert (
  workout_plan_id,
  position,
  name,
  notes
)
on public.workout_days
to authenticated;

grant update (
  position,
  name,
  notes
)
on public.workout_days
to authenticated;

grant delete
on table public.workout_days
to authenticated;


grant select
on table public.workout_exercises
to authenticated;

grant insert (
  workout_day_id,
  position,
  name,
  sets,
  reps,
  rest_seconds,
  tempo,
  notes
)
on public.workout_exercises
to authenticated;

grant update (
  position,
  name,
  sets,
  reps,
  rest_seconds,
  tempo,
  notes
)
on public.workout_exercises
to authenticated;

grant delete
on table public.workout_exercises
to authenticated;


grant select
on table public.workout_plan_assignments
to authenticated;

grant insert (
  workspace_id,
  client_id,
  workout_plan_id,
  assigned_by,
  status,
  starts_on,
  ends_on
)
on public.workout_plan_assignments
to authenticated;

grant update (
  status,
  starts_on,
  ends_on
)
on public.workout_plan_assignments
to authenticated;


grant usage
on type public.workout_plan_status
to authenticated;

grant usage
on type public.workout_assignment_status
to authenticated;


-- =========================================================
-- WORKOUT PLAN POLICIES
-- =========================================================

create policy workout_plans_select_accessible
on public.workout_plans
for select
to authenticated
using (
  private.can_access_workout_plan(id)
);

create policy workout_plans_insert_owned
on public.workout_plans
for insert
to authenticated
with check (
  private.is_workspace_owner(workspace_id)
  and created_by = (select auth.uid())
);

create policy workout_plans_update_owned
on public.workout_plans
for update
to authenticated
using (
  private.is_workspace_owner(workspace_id)
)
with check (
  private.is_workspace_owner(workspace_id)
);


-- =========================================================
-- WORKOUT DAY POLICIES
-- =========================================================

create policy workout_days_select_accessible
on public.workout_days
for select
to authenticated
using (
  private.can_access_workout_plan(workout_plan_id)
);

create policy workout_days_insert_owned
on public.workout_days
for insert
to authenticated
with check (
  private.is_workout_plan_owner(workout_plan_id)
);

create policy workout_days_update_owned
on public.workout_days
for update
to authenticated
using (
  private.is_workout_plan_owner(workout_plan_id)
)
with check (
  private.is_workout_plan_owner(workout_plan_id)
);

create policy workout_days_delete_owned
on public.workout_days
for delete
to authenticated
using (
  private.is_workout_plan_owner(workout_plan_id)
);


-- =========================================================
-- WORKOUT EXERCISE POLICIES
-- =========================================================

create policy workout_exercises_select_accessible
on public.workout_exercises
for select
to authenticated
using (
  private.can_access_workout_day(workout_day_id)
);

create policy workout_exercises_insert_owned
on public.workout_exercises
for insert
to authenticated
with check (
  private.is_workout_day_owner(workout_day_id)
);

create policy workout_exercises_update_owned
on public.workout_exercises
for update
to authenticated
using (
  private.is_workout_day_owner(workout_day_id)
)
with check (
  private.is_workout_day_owner(workout_day_id)
);

create policy workout_exercises_delete_owned
on public.workout_exercises
for delete
to authenticated
using (
  private.is_workout_day_owner(workout_day_id)
);


-- =========================================================
-- ASSIGNMENT POLICIES
-- =========================================================

create policy workout_assignments_select_accessible
on public.workout_plan_assignments
for select
to authenticated
using (
  private.is_workspace_owner(workspace_id)
  or (
    private.is_active_workspace_member(workspace_id)
    and exists (
      select 1
      from public.clients as client
      where client.id = workout_plan_assignments.client_id
        and client.workspace_id =
          workout_plan_assignments.workspace_id
        and client.user_id = (select auth.uid())
    )
  )
);

create policy workout_assignments_insert_owned
on public.workout_plan_assignments
for insert
to authenticated
with check (
  private.is_workspace_owner(workspace_id)
  and assigned_by = (select auth.uid())
  and exists (
    select 1
    from public.workout_plans as plan
    where plan.id = workout_plan_assignments.workout_plan_id
      and plan.workspace_id =
        workout_plan_assignments.workspace_id
      and plan.status = 'active'
  )
  and exists (
    select 1
    from public.clients as client
    where client.id = workout_plan_assignments.client_id
      and client.workspace_id =
        workout_plan_assignments.workspace_id
      and client.status <> 'archived'
  )
);

create policy workout_assignments_update_owned
on public.workout_plan_assignments
for update
to authenticated
using (
  private.is_workspace_owner(workspace_id)
)
with check (
  private.is_workspace_owner(workspace_id)
);