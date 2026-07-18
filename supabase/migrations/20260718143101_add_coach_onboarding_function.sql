create or replace function public.complete_coach_onboarding(
  full_name text,
  workspace_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  created_workspace_id uuid;
begin
  if current_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication required';
  end if;

  if char_length(btrim(full_name)) not between 1 and 120 then
    raise exception using
      errcode = '22023',
      message = 'Full name must contain between 1 and 120 characters';
  end if;

  if char_length(btrim(workspace_name)) not between 1 and 120 then
    raise exception using
      errcode = '22023',
      message = 'Workspace name must contain between 1 and 120 characters';
  end if;

  if exists (
    select 1
    from public.workspaces
    where owner_id = current_user_id
  ) then
    raise exception using
      errcode = '23505',
      message = 'Coach onboarding has already been completed';
  end if;

  insert into public.profiles (
    id,
    full_name
  )
  values (
    current_user_id,
    btrim(full_name)
  )
  on conflict (id) do update
  set full_name = excluded.full_name;

  insert into public.workspaces (
    name,
    owner_id
  )
  values (
    btrim(workspace_name),
    current_user_id
  )
  returning id into created_workspace_id;

  insert into public.workspace_members (
    workspace_id,
    user_id,
    role,
    status
  )
  values (
    created_workspace_id,
    current_user_id,
    'coach',
    'active'
  );

  return created_workspace_id;
end;
$$;

revoke all
on function public.complete_coach_onboarding(text, text)
from public;

grant execute
on function public.complete_coach_onboarding(text, text)
to authenticated;