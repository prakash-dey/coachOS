drop policy if exists client_onboarding_photos_select_accessible
on storage.objects;

create policy client_onboarding_photos_select_accessible
on storage.objects
for select
to authenticated
using (
  bucket_id = 'client-onboarding-photos'
  and (
    exists (
      select 1
      from public.clients as client
      join public.workspaces as workspace
        on workspace.id = client.workspace_id
      where client.workspace_id::text = split_part(storage.objects.name, '/', 1)
        and client.user_id::text = split_part(storage.objects.name, '/', 2)
        and client.id::text = split_part(storage.objects.name, '/', 3)
        and workspace.owner_id = (select auth.uid())
    )
    or (
      split_part(storage.objects.name, '/', 2) = (select auth.uid())::text
      and exists (
        select 1
        from public.workspace_members as member
        where member.workspace_id::text = split_part(storage.objects.name, '/', 1)
          and member.user_id = (select auth.uid())
          and member.role = 'client'
          and member.status = 'active'
      )
    )
  )
);
