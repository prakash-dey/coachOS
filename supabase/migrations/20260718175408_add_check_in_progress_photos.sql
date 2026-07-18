alter table public.check_ins
add column progress_photo_path text;

alter table public.check_ins
add constraint check_ins_progress_photo_path_length
check (
  progress_photo_path is null
  or char_length(progress_photo_path) between 1 and 500
);

grant insert (
  progress_photo_path
)
on public.check_ins
to authenticated;


insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'check-in-photos',
  'check-in-photos',
  false,
  1048576,
  array['image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 1048576,
  allowed_mime_types = array['image/webp'];


create policy check_in_photos_select_accessible
on storage.objects
for select
to authenticated
using (
  bucket_id = 'check-in-photos'
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


create policy check_in_photos_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'check-in-photos'
  and split_part(name, '/', 2) = (select auth.uid())::text
  and split_part(name, '/', 3) =
    to_char(
      date_trunc('week', now() at time zone 'UTC'),
      'YYYY-MM-DD'
    ) || '.webp'
  and exists (
    select 1
    from public.workspace_members as member
    where member.workspace_id::text = split_part(name, '/', 1)
      and member.user_id = (select auth.uid())
      and member.role = 'client'
      and member.status = 'active'
  )
);


create policy check_in_photos_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'check-in-photos'
  and split_part(name, '/', 2) = (select auth.uid())::text
  and exists (
    select 1
    from public.workspace_members as member
    where member.workspace_id::text = split_part(name, '/', 1)
      and member.user_id = (select auth.uid())
      and member.role = 'client'
      and member.status = 'active'
  )
);