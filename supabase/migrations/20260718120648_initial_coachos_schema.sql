-- =========================================================
-- PRIVATE SCHEMA
-- =========================================================

-- Helper functions that should not be exposed through the API
create schema if not exists private;

revoke all on schema private from public;


-- =========================================================
-- ENUMS
-- =========================================================

create type public.workspace_role as enum (
  'coach',
  'client'
);

create type public.membership_status as enum (
  'active',
  'suspended'
);

create type public.client_status as enum (
  'active',
  'paused',
  'archived'
);

create type public.invitation_status as enum (
  'pending',
  'accepted',
  'expired',
  'revoked'
);


-- =========================================================
-- PROFILES
-- =========================================================

create table public.profiles (
  id uuid primary key
    references auth.users (id)
    on delete cascade,

  full_name text not null,
  avatar_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_full_name_length
    check (char_length(btrim(full_name)) between 1 and 120)
);


-- =========================================================
-- WORKSPACES
-- =========================================================

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),

  name text not null,

  owner_id uuid not null unique
    references auth.users (id)
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint workspaces_name_length
    check (char_length(btrim(name)) between 1 and 120)
);


-- =========================================================
-- WORKSPACE MEMBERS
-- =========================================================

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),

  workspace_id uuid not null
    references public.workspaces (id)
    on delete cascade,

  user_id uuid not null unique
    references auth.users (id)
    on delete cascade,

  role public.workspace_role not null,

  status public.membership_status not null
    default 'active',

  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- =========================================================
-- CLIENTS
-- =========================================================

create table public.clients (
  id uuid primary key default gen_random_uuid(),

  workspace_id uuid not null
    references public.workspaces (id)
    on delete cascade,

  user_id uuid unique
    references auth.users (id)
    on delete set null,

  first_name text not null,
  last_name text not null,

  email text,
  phone text,

  status public.client_status not null
    default 'active',

  timezone text not null
    default 'UTC',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint clients_first_name_length
    check (char_length(btrim(first_name)) between 1 and 100),

  constraint clients_last_name_length
    check (char_length(btrim(last_name)) between 1 and 100),

  constraint clients_email_length
    check (
      email is null
      or char_length(btrim(email)) between 3 and 254
    ),

  constraint clients_phone_length
    check (
      phone is null
      or char_length(btrim(phone)) between 3 and 32
    ),

  constraint clients_timezone_length
    check (char_length(btrim(timezone)) between 1 and 100),

  -- Required so invitations can enforce that their client and
  -- workspace belong together.
  constraint clients_workspace_id_id_unique
    unique (workspace_id, id)
);


-- =========================================================
-- WORKSPACE INVITATIONS
-- =========================================================

create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),

  workspace_id uuid not null,

  client_id uuid not null,

  created_by uuid not null
    references auth.users (id)
    on delete restrict,

  -- SHA-256 represented as 64 lowercase hexadecimal characters
  token_hash text not null unique,

  status public.invitation_status not null
    default 'pending',

  expires_at timestamptz not null,

  accepted_by uuid
    references auth.users (id)
    on delete set null,

  accepted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint workspace_invitations_workspace_fk
    foreign key (workspace_id)
    references public.workspaces (id)
    on delete cascade,

  constraint workspace_invitations_client_workspace_fk
    foreign key (workspace_id, client_id)
    references public.clients (workspace_id, id)
    on delete cascade,

  constraint workspace_invitations_token_hash_format
    check (token_hash ~ '^[0-9a-f]{64}$'),

  constraint workspace_invitations_expiration
    check (expires_at > created_at),

  constraint workspace_invitations_acceptance_state
    check (
      (
        status = 'accepted'
        and accepted_at is not null
      )
      or
      (
        status <> 'accepted'
        and accepted_at is null
        and accepted_by is null
      )
    )
);


-- =========================================================
-- INDEXES
-- =========================================================

create index workspace_members_workspace_id_idx
  on public.workspace_members (workspace_id);

-- user_id already receives an index from its unique constraint.

create index clients_workspace_id_idx
  on public.clients (workspace_id);

create index clients_workspace_status_idx
  on public.clients (workspace_id, status);

create index clients_workspace_name_idx
  on public.clients (
    workspace_id,
    last_name,
    first_name
  );

create index workspace_invitations_workspace_id_idx
  on public.workspace_invitations (workspace_id);

create index workspace_invitations_client_id_idx
  on public.workspace_invitations (client_id);

create index workspace_invitations_status_expires_idx
  on public.workspace_invitations (
    status,
    expires_at
  );

-- A client can have many historical invitations, but only one
-- invitation can currently be pending.
create unique index workspace_invitations_one_pending_per_client_idx
  on public.workspace_invitations (client_id)
  where status = 'pending';


-- =========================================================
-- UPDATED_AT TRIGGER
-- =========================================================

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function private.set_updated_at();

create trigger workspaces_set_updated_at
before update on public.workspaces
for each row
execute function private.set_updated_at();

create trigger workspace_members_set_updated_at
before update on public.workspace_members
for each row
execute function private.set_updated_at();

create trigger clients_set_updated_at
before update on public.clients
for each row
execute function private.set_updated_at();

create trigger workspace_invitations_set_updated_at
before update on public.workspace_invitations
for each row
execute function private.set_updated_at();


-- =========================================================
-- RLS HELPER FUNCTIONS
-- =========================================================

-- Returns true when the authenticated user owns the workspace.
create function private.is_workspace_owner(
  target_workspace_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspaces
    where id = target_workspace_id
      and owner_id = (select auth.uid())
  );
$$;

-- Returns true when the authenticated user has an active
-- membership in the workspace.
create function private.is_active_workspace_member(
  target_workspace_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = (select auth.uid())
      and status = 'active'
  );
$$;

-- Do not allow ordinary users to invoke the trigger function.
revoke execute on function private.set_updated_at()
  from public, anon, authenticated;

-- Permit authenticated users to use only the boolean helpers.
grant usage on schema private to authenticated;

revoke all on function private.is_workspace_owner(uuid)
  from public;

revoke all on function private.is_active_workspace_member(uuid)
  from public;

grant execute on function private.is_workspace_owner(uuid)
  to authenticated;

grant execute on function private.is_active_workspace_member(uuid)
  to authenticated;


-- =========================================================
-- ENABLE ROW LEVEL SECURITY
-- =========================================================

alter table public.profiles
  enable row level security;

alter table public.workspaces
  enable row level security;

alter table public.workspace_members
  enable row level security;

alter table public.clients
  enable row level security;

alter table public.workspace_invitations
  enable row level security;


-- =========================================================
-- TABLE AND TYPE PRIVILEGES
-- =========================================================

-- Anonymous visitors receive no direct application-table access.
revoke all on table public.profiles
  from anon;

revoke all on table public.workspaces
  from anon;

revoke all on table public.workspace_members
  from anon;

revoke all on table public.clients
  from anon;

revoke all on table public.workspace_invitations
  from anon;

-- Authenticated users receive only operations supported by RLS.
grant select, insert, update
  on table public.profiles
  to authenticated;

grant select, update
  on table public.workspaces
  to authenticated;

grant select, update
  on table public.workspace_members
  to authenticated;

grant select, insert, update
  on table public.clients
  to authenticated;

grant select, insert, update
  on table public.workspace_invitations
  to authenticated;

grant usage on type public.workspace_role
  to authenticated;

grant usage on type public.membership_status
  to authenticated;

grant usage on type public.client_status
  to authenticated;

grant usage on type public.invitation_status
  to authenticated;


-- =========================================================
-- PROFILE POLICIES
-- =========================================================

create policy profiles_select_own
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
);

create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (
  id = (select auth.uid())
);

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (
  id = (select auth.uid())
)
with check (
  id = (select auth.uid())
);


-- =========================================================
-- WORKSPACE POLICIES
-- =========================================================

create policy workspaces_select_accessible
on public.workspaces
for select
to authenticated
using (
  owner_id = (select auth.uid())
  or private.is_active_workspace_member(id)
);

create policy workspaces_update_owned
on public.workspaces
for update
to authenticated
using (
  owner_id = (select auth.uid())
)
with check (
  owner_id = (select auth.uid())
);

-- There is intentionally no direct authenticated INSERT policy.
-- Coach workspace creation will happen through trusted onboarding code.


-- =========================================================
-- WORKSPACE MEMBER POLICIES
-- =========================================================

create policy workspace_members_select_accessible
on public.workspace_members
for select
to authenticated
using (
  user_id = (select auth.uid())
  or private.is_workspace_owner(workspace_id)
);

create policy workspace_members_update_owned
on public.workspace_members
for update
to authenticated
using (
  private.is_workspace_owner(workspace_id)
)
with check (
  private.is_workspace_owner(workspace_id)
);

-- Membership creation occurs through trusted coach onboarding or
-- invitation-acceptance code, not direct browser inserts.


-- =========================================================
-- CLIENT POLICIES
-- =========================================================

create policy clients_select_accessible
on public.clients
for select
to authenticated
using (
  private.is_workspace_owner(workspace_id)
  or (
    user_id = (select auth.uid())
    and private.is_active_workspace_member(workspace_id)
  )
);

create policy clients_insert_owned
on public.clients
for insert
to authenticated
with check (
  private.is_workspace_owner(workspace_id)
);

create policy clients_update_owned
on public.clients
for update
to authenticated
using (
  private.is_workspace_owner(workspace_id)
)
with check (
  private.is_workspace_owner(workspace_id)
);

-- Clients are archived instead of directly deleted.


-- =========================================================
-- INVITATION POLICIES
-- =========================================================

create policy workspace_invitations_select_owned
on public.workspace_invitations
for select
to authenticated
using (
  private.is_workspace_owner(workspace_id)
);

create policy workspace_invitations_insert_owned
on public.workspace_invitations
for insert
to authenticated
with check (
  private.is_workspace_owner(workspace_id)
  and created_by = (select auth.uid())
);

create policy workspace_invitations_update_owned
on public.workspace_invitations
for update
to authenticated
using (
  private.is_workspace_owner(workspace_id)
)
with check (
  private.is_workspace_owner(workspace_id)
  and created_by = (select auth.uid())
);
