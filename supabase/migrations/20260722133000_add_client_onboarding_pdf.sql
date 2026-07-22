alter table public.client_intake_forms
add column if not exists document_pdf_path text
check (
  document_pdf_path is null
  or char_length(document_pdf_path) between 1 and 500
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'client-onboarding-documents',
  'client-onboarding-documents',
  false,
  5242880,
  array['application/pdf']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['application/pdf'];

create policy client_onboarding_documents_select_accessible
on storage.objects
for select
to authenticated
using (
  bucket_id = 'client-onboarding-documents'
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

create policy client_onboarding_documents_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'client-onboarding-documents'
  and split_part(name, '/', 2) = (select auth.uid())::text
  and split_part(name, '/', 4) = 'medical-report.pdf'
  and exists (
    select 1
    from public.clients as client
    where client.workspace_id::text = split_part(name, '/', 1)
      and client.user_id = (select auth.uid())
      and client.id::text = split_part(name, '/', 3)
      and client.status = 'active'
  )
);

create policy client_onboarding_documents_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'client-onboarding-documents'
  and split_part(name, '/', 2) = (select auth.uid())::text
);
