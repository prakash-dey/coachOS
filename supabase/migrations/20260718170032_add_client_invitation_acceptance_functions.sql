create or replace function public.preview_client_invitation(
  invitation_token text
)
returns table (
  workspace_name text,
  client_first_name text,
  invitation_expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    workspace.name,
    client.first_name,
    invitation.expires_at
  from public.workspace_invitations as invitation
  join public.workspaces as workspace
    on workspace.id = invitation.workspace_id
  join public.clients as client
    on client.id = invitation.client_id
  where invitation_token ~ '^[0-9a-f]{64}$'
    and invitation.token_hash = encode(
      extensions.digest(invitation_token, 'sha256'),
      'hex'
    )
    and invitation.status = 'pending'
    and invitation.expires_at > now()
  limit 1;
$$;

revoke all
on function public.preview_client_invitation(text)
from public;

grant execute
on function public.preview_client_invitation(text)
to anon, authenticated;


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
    raise exception using
      errcode = '42501',
      message = 'Authentication required';
  end if;

  if invitation_token !~ '^[0-9a-f]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'Invalid invitation';
  end if;

  select auth_user.email
  into current_user_email
  from auth.users as auth_user
  where auth_user.id = current_user_id;

  if current_user_email is null then
    raise exception using
      errcode = '42501',
      message = 'A verified email is required';
  end if;

  select
    invitation.id as invitation_id,
    invitation.client_id,
    invitation.workspace_id,
    client.user_id as existing_client_user_id,
    client.email as invited_email,
    client.first_name,
    client.last_name
  into invitation_record
  from public.workspace_invitations as invitation
  join public.clients as client
    on client.id = invitation.client_id
    and client.workspace_id = invitation.workspace_id
  where invitation.token_hash = encode(
      extensions.digest(invitation_token, 'sha256'),
      'hex'
    )
    and invitation.status = 'pending'
    and invitation.expires_at > now()
    and client.status = 'active'
  for update of invitation, client;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'Invitation is invalid or expired';
  end if;

  if lower(btrim(invitation_record.invited_email))
    <> lower(btrim(current_user_email)) then
    raise exception using
      errcode = '42501',
      message = 'Signed-in email does not match the invitation';
  end if;

  if invitation_record.existing_client_user_id is not null
    and invitation_record.existing_client_user_id <> current_user_id then
    raise exception using
      errcode = '42501',
      message = 'Client is already linked to another user';
  end if;

  if exists (
    select 1
    from public.workspace_members
    where user_id = current_user_id
  ) then
    raise exception using
      errcode = '23505',
      message = 'User already belongs to a workspace';
  end if;

  insert into public.profiles (
    id,
    full_name
  )
  values (
    current_user_id,
    left(
      btrim(
        concat_ws(
          ' ',
          invitation_record.first_name,
          invitation_record.last_name
        )
      ),
      120
    )
  )
  on conflict (id) do nothing;

  update public.clients
  set user_id = current_user_id
  where id = invitation_record.client_id
    and workspace_id = invitation_record.workspace_id;

  insert into public.workspace_members (
    workspace_id,
    user_id,
    role,
    status
  )
  values (
    invitation_record.workspace_id,
    current_user_id,
    'client',
    'active'
  );

  update public.workspace_invitations
  set
    status = 'accepted',
    accepted_by = current_user_id,
    accepted_at = now()
  where id = invitation_record.invitation_id;

  return query
  select
    invitation_record.client_id,
    invitation_record.workspace_id;
end;
$$;

revoke all
on function public.accept_client_invitation(text)
from public;

grant execute
on function public.accept_client_invitation(text)
to authenticated;