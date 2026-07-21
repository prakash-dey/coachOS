create table public.client_intake_forms (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null,
  submitted_by uuid not null references auth.users(id) on delete restrict,
  primary_goal text not null check (char_length(btrim(primary_goal)) between 3 and 500),
  training_experience text not null check (training_experience in ('beginner', 'intermediate', 'advanced')),
  activity_level text not null check (activity_level in ('sedentary', 'light', 'moderate', 'very_active')),
  training_days_per_week smallint not null check (training_days_per_week between 1 and 7),
  height_cm numeric(5,2) not null check (height_cm between 90 and 250),
  weight_kg numeric(6,2) not null check (weight_kg between 20 and 500),
  waist_cm numeric(6,2) not null check (waist_cm between 30 and 250),
  chest_cm numeric(6,2) check (chest_cm is null or chest_cm between 30 and 250),
  hip_cm numeric(6,2) check (hip_cm is null or hip_cm between 30 and 250),
  thigh_cm numeric(6,2) check (thigh_cm is null or thigh_cm between 20 and 150),
  arm_cm numeric(6,2) check (arm_cm is null or arm_cm between 10 and 100),
  usual_food_habits text not null check (char_length(btrim(usual_food_habits)) between 3 and 1000),
  dietary_preference text not null check (char_length(btrim(dietary_preference)) between 2 and 120),
  allergies text not null check (char_length(btrim(allergies)) between 2 and 1000),
  medical_history text not null check (char_length(btrim(medical_history)) between 2 and 1500),
  injuries_or_limitations text not null check (char_length(btrim(injuries_or_limitations)) between 2 and 1500),
  medications text check (medications is null or char_length(btrim(medications)) between 2 and 1000),
  sleep_hours numeric(3,1) check (sleep_hours is null or sleep_hours between 0 and 16),
  stress_level smallint check (stress_level is null or stress_level between 1 and 5),
  emergency_contact_name text not null check (char_length(btrim(emergency_contact_name)) between 2 and 120),
  emergency_contact_phone text not null check (char_length(btrim(emergency_contact_phone)) between 3 and 32),
  front_photo_path text not null check (char_length(front_photo_path) between 1 and 500),
  side_photo_path text not null check (char_length(side_photo_path) between 1 and 500),
  back_photo_path text not null check (char_length(back_photo_path) between 1 and 500),
  notes text check (notes is null or char_length(btrim(notes)) between 2 and 1500),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, client_id),
  foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete cascade
);

create index client_intake_forms_workspace_client_idx
on public.client_intake_forms (workspace_id, client_id);

create trigger client_intake_forms_set_updated_at
before update on public.client_intake_forms
for each row execute function private.set_updated_at();

alter table public.client_intake_forms enable row level security;
revoke all on public.client_intake_forms from anon, authenticated;
grant select, insert, update on public.client_intake_forms to authenticated;

create policy client_intake_forms_select_accessible
on public.client_intake_forms
for select
to authenticated
using (
  private.is_workspace_owner(workspace_id)
  or exists (
    select 1
    from public.clients as client
    where client.id = client_intake_forms.client_id
      and client.workspace_id = client_intake_forms.workspace_id
      and client.user_id = (select auth.uid())
      and private.is_active_workspace_member(client.workspace_id)
  )
);

create policy client_intake_forms_insert_own
on public.client_intake_forms
for insert
to authenticated
with check (
  submitted_by = (select auth.uid())
  and exists (
    select 1
    from public.clients as client
    where client.id = client_intake_forms.client_id
      and client.workspace_id = client_intake_forms.workspace_id
      and client.user_id = (select auth.uid())
      and client.status = 'active'
      and private.is_active_workspace_member(client.workspace_id)
  )
);

create policy client_intake_forms_update_own
on public.client_intake_forms
for update
to authenticated
using (
  submitted_by = (select auth.uid())
  and exists (
    select 1
    from public.clients as client
    where client.id = client_intake_forms.client_id
      and client.workspace_id = client_intake_forms.workspace_id
      and client.user_id = (select auth.uid())
      and client.status = 'active'
      and private.is_active_workspace_member(client.workspace_id)
  )
)
with check (
  submitted_by = (select auth.uid())
  and exists (
    select 1
    from public.clients as client
    where client.id = client_intake_forms.client_id
      and client.workspace_id = client_intake_forms.workspace_id
      and client.user_id = (select auth.uid())
      and client.status = 'active'
      and private.is_active_workspace_member(client.workspace_id)
  )
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'client-onboarding-photos',
  'client-onboarding-photos',
  false,
  1048576,
  array['image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 1048576,
  allowed_mime_types = array['image/webp'];

create policy client_onboarding_photos_select_accessible
on storage.objects
for select
to authenticated
using (
  bucket_id = 'client-onboarding-photos'
  and (
    exists (
      select 1
      from public.workspaces as workspace
      where workspace.id::text = split_part(name, '/', 1)
        and workspace.owner_id = (select auth.uid())
    )
    or (
      split_part(name, '/', 2) = (select auth.uid())::text
      and exists (
        select 1
        from public.workspace_members as member
        where member.workspace_id::text = split_part(name, '/', 1)
          and member.user_id = (select auth.uid())
          and member.role = 'client'
          and member.status = 'active'
      )
    )
  )
);

create policy client_onboarding_photos_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'client-onboarding-photos'
  and split_part(name, '/', 2) = (select auth.uid())::text
  and split_part(name, '/', 4) in ('front.webp', 'side.webp', 'back.webp')
  and exists (
    select 1
    from public.clients as client
    where client.workspace_id::text = split_part(name, '/', 1)
      and client.user_id = (select auth.uid())
      and client.id::text = split_part(name, '/', 3)
      and client.status = 'active'
  )
);

create policy client_onboarding_photos_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'client-onboarding-photos'
  and split_part(name, '/', 2) = (select auth.uid())::text
);

create or replace function public.accept_client_invitation(
  invitation_token text
)
returns table (
  accepted_client_id uuid,
  accepted_workspace_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_user_email text;
  invitation_record record;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if invitation_token !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid invitation';
  end if;

  select auth_user.email into current_user_email
  from auth.users as auth_user
  where auth_user.id = current_user_id;

  if current_user_email is null then
    raise exception using errcode = '42501', message = 'A verified email is required';
  end if;

  select
    invitation.id as invitation_id,
    invitation.client_id,
    invitation.workspace_id,
    client.user_id as existing_client_user_id,
    client.first_name,
    client.last_name
  into invitation_record
  from public.workspace_invitations as invitation
  join public.clients as client
    on client.id = invitation.client_id
    and client.workspace_id = invitation.workspace_id
  where invitation.token_hash = encode(extensions.digest(invitation_token, 'sha256'), 'hex')
    and invitation.status = 'pending'
    and invitation.expires_at > now()
    and client.status = 'active'
  for update of invitation, client;

  if not found then
    raise exception using errcode = 'P0001', message = 'Invitation is invalid or expired';
  end if;

  if invitation_record.existing_client_user_id is not null
    and invitation_record.existing_client_user_id <> current_user_id then
    raise exception using errcode = '42501', message = 'Client is already linked to another user';
  end if;

  if exists (
    select 1
    from public.workspace_members
    where user_id = current_user_id
  ) then
    raise exception using errcode = '23505', message = 'User already belongs to a workspace';
  end if;

  insert into public.profiles (id, full_name)
  values (
    current_user_id,
    left(btrim(concat_ws(' ', invitation_record.first_name, invitation_record.last_name)), 120)
  )
  on conflict (id) do nothing;

  update public.clients
  set user_id = current_user_id,
      email = lower(btrim(current_user_email))
  where id = invitation_record.client_id
    and workspace_id = invitation_record.workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role, status)
  values (invitation_record.workspace_id, current_user_id, 'client', 'active');

  update public.workspace_invitations
  set status = 'accepted',
      accepted_by = current_user_id,
      accepted_at = now()
  where id = invitation_record.invitation_id;

  return query select invitation_record.client_id, invitation_record.workspace_id;
end;
$$;

revoke all on function public.accept_client_invitation(text) from public;
grant execute on function public.accept_client_invitation(text) to authenticated;
