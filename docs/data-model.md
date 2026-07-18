# CoachOS Data Model

## Purpose

CoachOS is a private coaching workspace for nutritionists and fitness
coaches. A coach manages clients, plans, check-ins, goals, and progress
inside their own workspace.

CoachOS is not a marketplace. Clients cannot browse or search for coaches,
view other clients, or independently join a workspace.

## MVP Scope

The first database milestone supports:

- Coach authentication
- One workspace per coach
- Coach-owned client records
- Single-use client join links
- Invitation-only client access
- Strict separation between coach workspaces

Workout plans, meal plans, goals, measurements, and check-ins will be added
in later feature migrations.

## MVP Roles

### Coach

A coach owns a CoachOS workspace and can:

- Create and manage client records
- Generate and revoke client join links
- View every client in their workspace
- Pause or archive clients
- Assign plans and review progress in later milestones

### Client

A client receives coaching inside one workspace and can:

- Join only through a valid invitation link
- Access only their own client record
- View only information assigned to them
- Never view other clients
- Never search for coaches or switch workspaces

A client record may exist before the client creates an authentication account.

## Technology and Security Boundary

CoachOS uses:

- Supabase Auth for identities and sessions
- Supabase PostgreSQL for application data
- PostgreSQL Row Level Security (RLS) for tenant isolation
- Next.js server-side code for privileged invitation operations

Every table in the exposed `public` schema must have RLS enabled. The
workspace is the tenant boundary: data belonging to one workspace must never
be accessible from another workspace.

The Supabase secret key bypasses RLS. It must only be used in trusted
server-side code and must never be exposed to the browser or committed to Git.

## Authentication Identity

Supabase Auth manages every authenticated coach and client in:

```text
auth.users
```

CoachOS does not store passwords or authentication tokens. Supabase Auth is
responsible for account creation, email verification, sessions, magic-link
authentication, and password recovery.

CoachOS must not modify `auth.users` directly. Application tables reference
its user IDs through foreign keys.

## Profile

Table: `public.profiles`

A profile stores application information shared by authenticated coaches and
clients.

| Field | Type | Required | Default | Description |
|---|---|---:|---|---|
| `id` | `uuid` | Yes | None | Primary key referencing `auth.users.id` |
| `full_name` | `text` | Yes | None | User's display name |
| `avatar_url` | `text` | No | `null` | Optional profile image URL |
| `created_at` | `timestamptz` | Yes | `now()` | Profile creation time |
| `updated_at` | `timestamptz` | Yes | `now()` | Last profile update time |

### Profile Rules

- One authenticated user can have at most one profile.
- `profiles.id` must equal the related `auth.users.id`.
- A user can read and update their own profile.
- Passwords, tokens, and authorization roles are not stored here.
- Workspace membership determines whether someone is a coach or client.
- Deleting an authentication user deletes their profile.

## Workspace

Table: `public.workspaces`

A workspace is the private tenant owned by one coach.

| Field | Type | Required | Default | Description |
|---|---|---:|---|---|
| `id` | `uuid` | Yes | `gen_random_uuid()` | Workspace primary key |
| `name` | `text` | Yes | None | Coach's workspace or business name |
| `owner_id` | `uuid` | Yes | None | Coach referencing `auth.users.id` |
| `created_at` | `timestamptz` | Yes | `now()` | Workspace creation time |
| `updated_at` | `timestamptz` | Yes | `now()` | Last workspace update time |

### Workspace Rules

- `owner_id` is unique, enforcing one workspace per coach in the MVP.
- The owner is also represented as an active coach in `workspace_members`.
- Only the owner can update workspace settings.
- Account deletion must use an explicit workspace-deletion workflow; deleting
  a coach must not silently orphan or expose workspace data.

## Workspace Membership

Table: `public.workspace_members`

Membership defines which authenticated users belong to a workspace and their
authorization role.

### Membership Role

PostgreSQL enum: `workspace_role`

```text
coach
client
```

### Membership Status

PostgreSQL enum: `membership_status`

```text
active
suspended
```

| Field | Type | Required | Default | Description |
|---|---|---:|---|---|
| `id` | `uuid` | Yes | `gen_random_uuid()` | Membership primary key |
| `workspace_id` | `uuid` | Yes | None | Related workspace |
| `user_id` | `uuid` | Yes | None | Related authenticated user |
| `role` | `workspace_role` | Yes | None | Coach or client role |
| `status` | `membership_status` | Yes | `active` | Access status |
| `joined_at` | `timestamptz` | Yes | `now()` | Membership activation time |
| `created_at` | `timestamptz` | Yes | `now()` | Membership creation time |
| `updated_at` | `timestamptz` | Yes | `now()` | Last membership update time |

### Membership Rules

- `(workspace_id, user_id)` must be unique.
- `user_id` is unique in the MVP, so a user belongs to only one workspace.
- A workspace owner must have an active `coach` membership.
- Clients receive membership only after accepting a valid join link.
- A suspended membership cannot access protected workspace data.
- Roles must not be derived from editable user metadata.

## Client

Table: `public.clients`

A client record contains the coach-managed identity and contact details for a
person receiving coaching. It can exist before that person has a CoachOS login.

### Client Status

PostgreSQL enum: `client_status`

```text
active
paused
archived
```

| Field | Type | Required | Default | Description |
|---|---|---:|---|---|
| `id` | `uuid` | Yes | `gen_random_uuid()` | Client primary key |
| `workspace_id` | `uuid` | Yes | None | Workspace that owns the client |
| `user_id` | `uuid` | No | `null` | Auth user linked after invitation acceptance |
| `first_name` | `text` | Yes | None | Client's first name |
| `last_name` | `text` | Yes | None | Client's last name |
| `email` | `text` | No | `null` | Client contact email |
| `phone` | `text` | No | `null` | Client contact phone number |
| `status` | `client_status` | Yes | `active` | Coaching lifecycle status |
| `timezone` | `text` | Yes | `UTC` | IANA timezone identifier |
| `created_at` | `timestamptz` | Yes | `now()` | Client creation time |
| `updated_at` | `timestamptz` | Yes | `now()` | Last client update time |

### Client Rules

- Every client belongs to exactly one workspace.
- `user_id` is nullable until the join invitation is accepted.
- A non-null `user_id` must be unique so one login cannot claim two client
  records in the MVP.
- Coaches can manage all client records in their own workspace.
- A linked client can read only the client record whose `user_id` matches
  their authenticated ID.
- Clients are normally archived rather than permanently deleted.
- Sensitive health data will live in separate tables in later migrations.

## Workspace Invitation

Table: `public.workspace_invitations`

An invitation is a single-use authorization to claim one client record and
join its workspace.

### Invitation Status

PostgreSQL enum: `invitation_status`

```text
pending
accepted
expired
revoked
```

| Field | Type | Required | Default | Description |
|---|---|---:|---|---|
| `id` | `uuid` | Yes | `gen_random_uuid()` | Invitation primary key |
| `workspace_id` | `uuid` | Yes | None | Workspace being joined |
| `client_id` | `uuid` | Yes | None | Client record being claimed |
| `created_by` | `uuid` | Yes | None | Coach who created the invitation |
| `token_hash` | `text` | Yes | None | Unique SHA-256 hash of the join token |
| `status` | `invitation_status` | Yes | `pending` | Invitation lifecycle status |
| `expires_at` | `timestamptz` | Yes | None | Time after which the link is invalid |
| `accepted_by` | `uuid` | No | `null` | Authenticated user who accepted it |
| `accepted_at` | `timestamptz` | No | `null` | Acceptance time |
| `created_at` | `timestamptz` | Yes | `now()` | Invitation creation time |
| `updated_at` | `timestamptz` | Yes | `now()` | Last invitation update time |

### Invitation Rules

- The raw token appears only in the join URL and is never stored.
- `token_hash` must be unique.
- A link is valid only when its status is `pending` and `expires_at` is in the
  future.
- Join links expire after 24 hours in the MVP.
- A coach can revoke a pending invitation.
- Only one pending invitation should exist for a client at a time.
- An invitation can be accepted only once.
- Acceptance must occur atomically: validate the invite, create membership,
  link `clients.user_id`, and mark the invitation accepted in one transaction.
- Invitation rows must not be directly readable by anonymous users.

## Invitation-Only Client Access Flow

1. The coach creates a client record without a `user_id`.
2. The coach requests a join link for that client.
3. Trusted server code creates a cryptographically random token.
4. CoachOS stores only the token's SHA-256 hash.
5. The coach shares `/join/{raw-token}` through any communication channel.
6. CoachOS validates that the invitation is pending and unexpired.
7. The client authenticates through Supabase Auth.
8. Server-side code validates the invitation again after authentication.
9. CoachOS creates an active client membership.
10. CoachOS links the authenticated user to `clients.user_id`.
11. CoachOS marks the invitation accepted and records the accepting user.
12. The link becomes unusable.

## Entity Relationships

```text
auth.users
    │
    ├── 0..1 profiles
    ├── 0..1 owned workspaces
    └── 0..1 workspace_members

workspaces
    │
    ├── many workspace_members
    ├── many clients
    └── many workspace_invitations

clients
    │
    ├── 0..1 authenticated user
    └── many historical workspace_invitations
```

## Row Level Security Requirements

### Profiles

- Authenticated users can select and update only their own profile.
- Profile creation is limited to the matching authenticated user or trusted
  server-side onboarding code.

### Workspaces

- An owner can select and update their workspace.
- Active members can select only the basic workspace information required by
  their portal.
- Clients cannot list or search workspaces.

### Workspace Members

- A coach can manage memberships in their own workspace.
- A client can select only their own membership row.
- Clients cannot list other workspace members.

### Clients

- A coach can select, insert, and update clients in their own workspace.
- A client can select only the row linked to their authenticated user ID.
- Clients do not receive direct delete permission.
- Client-side updates will use narrowly scoped server actions or later
  purpose-specific tables rather than unrestricted row updates.

### Workspace Invitations

- A coach can create, view, revoke, and replace invitations for clients in
  their own workspace.
- Anonymous and ordinary client sessions cannot list invitation rows.
- Join-token validation and acceptance occur through trusted server-side code
  or a security-definer database function with a minimal interface.

## Constraints and Indexes

Required uniqueness constraints:

- `workspaces.owner_id`
- `(workspace_members.workspace_id, workspace_members.user_id)`
- `workspace_members.user_id`
- `clients.user_id` when it is not null
- `workspace_invitations.token_hash`

Required indexes:

- `workspace_members(workspace_id)`
- `workspace_members(user_id)`
- `clients(workspace_id)`
- `clients(workspace_id, status)`
- `clients(workspace_id, last_name, first_name)`
- `workspace_invitations(workspace_id)`
- `workspace_invitations(client_id)`
- `workspace_invitations(status, expires_at)`

A partial unique index should enforce at most one `pending` invitation per
client.

## Timestamp Rules

- All timestamps use `timestamptz` and are stored in UTC.
- `created_at` defaults to `now()`.
- `updated_at` defaults to `now()` and is maintained by a database trigger.
- Display conversion uses the coach or client's IANA timezone.

## Deletion and Retention

- Clients are archived instead of normally hard-deleted.
- Deleting an invited client's auth account sets `clients.user_id` to null so
  the coaching record remains intact.
- Deleting a workspace is an explicit destructive workflow and cascades only
  after confirmation.
- Coach account deletion must first resolve or delete the owned workspace.
- Retention rules for health information will be defined before health-profile
  data is introduced.

## Initial Migration Scope

The first SQL migration will create:

1. `workspace_role`, `membership_status`, `client_status`, and
   `invitation_status` enums
2. `profiles`
3. `workspaces`
4. `workspace_members`
5. `clients`
6. `workspace_invitations`
7. Foreign keys and check constraints
8. Uniqueness constraints and indexes
9. The `updated_at` trigger
10. Row Level Security policies

## Future Tables

Future feature migrations may add:

- `health_profiles`
- `goals`
- `measurements`
- `workout_plans`
- `meal_plans`
- `check_ins`

These tables are intentionally excluded from the first migration so the team
can complete and verify the client-management vertical slice before expanding
the schema.
