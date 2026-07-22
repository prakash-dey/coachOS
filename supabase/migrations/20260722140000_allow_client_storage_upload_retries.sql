-- Retried client uploads should replace the client's own orphaned files instead
-- of failing with duplicate-object storage errors.

drop policy if exists client_onboarding_photos_update_own on storage.objects;

create policy client_onboarding_photos_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'client-onboarding-photos'
  and split_part(storage.objects.name, '/', 2) = (select auth.uid())::text
)
with check (
  bucket_id = 'client-onboarding-photos'
  and split_part(storage.objects.name, '/', 2) = (select auth.uid())::text
  and split_part(storage.objects.name, '/', 4) in ('front.webp', 'side.webp', 'back.webp')
  and exists (
    select 1
    from public.clients as client
    where client.workspace_id::text = split_part(storage.objects.name, '/', 1)
      and client.user_id = (select auth.uid())
      and client.id::text = split_part(storage.objects.name, '/', 3)
      and client.status = 'active'
  )
);

drop policy if exists client_onboarding_documents_update_own on storage.objects;

create policy client_onboarding_documents_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'client-onboarding-documents'
  and split_part(storage.objects.name, '/', 2) = (select auth.uid())::text
)
with check (
  bucket_id = 'client-onboarding-documents'
  and split_part(storage.objects.name, '/', 2) = (select auth.uid())::text
  and split_part(storage.objects.name, '/', 4) = 'medical-report.pdf'
  and exists (
    select 1
    from public.clients as client
    where client.workspace_id::text = split_part(storage.objects.name, '/', 1)
      and client.user_id = (select auth.uid())
      and client.id::text = split_part(storage.objects.name, '/', 3)
      and client.status = 'active'
  )
);

drop policy if exists check_in_photos_update_own on storage.objects;

create policy check_in_photos_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'check-in-photos'
  and split_part(storage.objects.name, '/', 2) = (select auth.uid())::text
)
with check (
  bucket_id = 'check-in-photos'
  and split_part(storage.objects.name, '/', 2) = (select auth.uid())::text
  and exists (
    select 1
    from public.workspace_members as member
    where member.workspace_id::text = split_part(storage.objects.name, '/', 1)
      and member.user_id = (select auth.uid())
      and member.role = 'client'
      and member.status = 'active'
  )
  and (
    (
      array_length(string_to_array(storage.objects.name, '/'), 1) = 3
      and split_part(storage.objects.name, '/', 3) =
        to_char(
          date_trunc('week', now() at time zone 'UTC'),
          'YYYY-MM-DD'
        ) || '.webp'
    )
    or (
      array_length(string_to_array(storage.objects.name, '/'), 1) = 5
      and split_part(storage.objects.name, '/', 4) =
        to_char(
          date_trunc('week', now() at time zone 'UTC'),
          'YYYY-MM-DD'
        )
      and split_part(storage.objects.name, '/', 5) in (
        'front.webp',
        'side.webp',
        'back.webp'
      )
      and exists (
        select 1
        from public.clients as client
        where client.id::text = split_part(storage.objects.name, '/', 3)
          and client.workspace_id::text = split_part(storage.objects.name, '/', 1)
          and client.user_id = (select auth.uid())
          and client.status = 'active'
      )
    )
  )
);
