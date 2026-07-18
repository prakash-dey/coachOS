create table public.check_ins (
  id uuid primary key default gen_random_uuid(),

  workspace_id uuid not null,

  client_id uuid not null,

  submitted_by uuid not null
    references auth.users (id)
    on delete restrict,

  week_start date not null,

  weight_kg numeric(5, 2),

  energy_score smallint not null,

  mood_score smallint not null,

  notes text,

  coach_feedback text,

  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint check_ins_workspace_fk
    foreign key (workspace_id)
    references public.workspaces (id)
    on delete cascade,

  constraint check_ins_client_workspace_fk
    foreign key (workspace_id, client_id)
    references public.clients (workspace_id, id)
    on delete cascade,

  constraint check_ins_one_per_client_week
    unique (client_id, week_start),

  constraint check_ins_week_starts_monday
    check (extract(isodow from week_start) = 1),

  constraint check_ins_weight_range
    check (
      weight_kg is null
      or weight_kg between 20 and 500
    ),

  constraint check_ins_energy_range
    check (energy_score between 1 and 5),

  constraint check_ins_mood_range
    check (mood_score between 1 and 5),

  constraint check_ins_notes_length
    check (
      notes is null
      or char_length(btrim(notes)) between 1 and 3000
    ),

  constraint check_ins_feedback_length
    check (
      coach_feedback is null
      or char_length(btrim(coach_feedback)) between 1 and 3000
    ),

  constraint check_ins_review_state
    check (
      (
        coach_feedback is null
        and reviewed_at is null
      )
      or
      (
        coach_feedback is not null
        and reviewed_at is not null
      )
    )
);


create index check_ins_workspace_week_idx
  on public.check_ins (
    workspace_id,
    week_start desc
  );

create index check_ins_client_week_idx
  on public.check_ins (
    client_id,
    week_start desc
  );


create trigger check_ins_set_updated_at
before update on public.check_ins
for each row
execute function private.set_updated_at();


alter table public.check_ins
enable row level security;


revoke all
on table public.check_ins
from anon, authenticated;

grant select
on table public.check_ins
to authenticated;

grant insert (
  workspace_id,
  client_id,
  submitted_by,
  week_start,
  weight_kg,
  energy_score,
  mood_score,
  notes
)
on public.check_ins
to authenticated;

grant update (
  coach_feedback,
  reviewed_at
)
on public.check_ins
to authenticated;


create policy check_ins_select_accessible
on public.check_ins
for select
to authenticated
using (
  private.is_workspace_owner(workspace_id)
  or (
    submitted_by = (select auth.uid())
    and private.is_active_workspace_member(workspace_id)
  )
);


create policy check_ins_insert_own
on public.check_ins
for insert
to authenticated
with check (
  submitted_by = (select auth.uid())
  and coach_feedback is null
  and reviewed_at is null
  and private.is_active_workspace_member(workspace_id)
  and exists (
    select 1
    from public.clients as client
    where client.id = check_ins.client_id
      and client.workspace_id = check_ins.workspace_id
      and client.user_id = (select auth.uid())
  )
);


create policy check_ins_update_owned
on public.check_ins
for update
to authenticated
using (
  private.is_workspace_owner(workspace_id)
)
with check (
  private.is_workspace_owner(workspace_id)
);