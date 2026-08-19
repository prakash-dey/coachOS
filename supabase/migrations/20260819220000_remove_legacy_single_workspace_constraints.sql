alter table public.workspaces drop constraint if exists workspaces_owner_id_key;
alter table public.workspace_members drop constraint if exists workspace_members_user_id_key;
alter table public.clients drop constraint if exists clients_user_id_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.workspace_members'::regclass
      and conname = 'workspace_members_workspace_user_unique'
  ) then
    alter table public.workspace_members
      add constraint workspace_members_workspace_user_unique unique (workspace_id, user_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.clients'::regclass
      and conname = 'clients_workspace_user_unique'
  ) then
    alter table public.clients
      add constraint clients_workspace_user_unique unique (workspace_id, user_id);
  end if;
end;
$$;
