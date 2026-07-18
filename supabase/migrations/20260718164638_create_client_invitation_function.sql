create extension if not exists pgcrypto
with schema extensions;

create or replace function public.create_client_invitation(
  requested_client_id uuid
)
returns table (
  token text,
  invitation_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  owned_workspace_id uuid;
  generated_token text;
  expiration_time timestamptz := now() + interval '24 hours';
begin
  if current_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication required';
  end if;

  select client.workspace_id
  into owned_workspace_id
  from public.clients as client
  join public.workspaces as workspace
    on workspace.id = client.workspace_id
  where client.id = requested_client_id
    and workspace.owner_id = current_user_id
    and client.status = 'active'
    and nullif(btrim(client.email), '') is not null;

  if owned_workspace_id is null then
    raise exception using
      errcode = '42501',
      message = 'Client is not eligible for an invitation';
  end if;

  update public.workspace_invitations
  set status = 'revoked'
  where client_id = requested_client_id
    and status = 'pending';

  generated_token :=
    encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.workspace_invitations (
    workspace_id,
    client_id,
    created_by,
    token_hash,
    status,
    expires_at
  )
  values (
    owned_workspace_id,
    requested_client_id,
    current_user_id,
    encode(
      extensions.digest(generated_token, 'sha256'),
      'hex'
    ),
    'pending',
    expiration_time
  );

  return query
  select generated_token, expiration_time;
end;
$$;

revoke all
on function public.create_client_invitation(uuid)
from public;

grant execute
on function public.create_client_invitation(uuid)
to authenticated;