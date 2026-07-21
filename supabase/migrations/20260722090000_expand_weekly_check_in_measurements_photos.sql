alter table public.check_ins
add column if not exists waist_cm numeric(6, 2),
add column if not exists chest_cm numeric(6, 2),
add column if not exists hip_cm numeric(6, 2),
add column if not exists thigh_cm numeric(6, 2),
add column if not exists arm_cm numeric(6, 2),
add column if not exists front_photo_path text,
add column if not exists side_photo_path text,
add column if not exists back_photo_path text;

update public.check_ins
set front_photo_path = progress_photo_path
where front_photo_path is null
  and progress_photo_path is not null;

alter table public.check_ins
drop constraint if exists check_ins_waist_cm_range,
drop constraint if exists check_ins_chest_cm_range,
drop constraint if exists check_ins_hip_cm_range,
drop constraint if exists check_ins_thigh_cm_range,
drop constraint if exists check_ins_arm_cm_range,
drop constraint if exists check_ins_front_photo_path_length,
drop constraint if exists check_ins_side_photo_path_length,
drop constraint if exists check_ins_back_photo_path_length;

alter table public.check_ins
add constraint check_ins_waist_cm_range
check (waist_cm is null or waist_cm between 30 and 250),
add constraint check_ins_chest_cm_range
check (chest_cm is null or chest_cm between 30 and 250),
add constraint check_ins_hip_cm_range
check (hip_cm is null or hip_cm between 30 and 250),
add constraint check_ins_thigh_cm_range
check (thigh_cm is null or thigh_cm between 20 and 150),
add constraint check_ins_arm_cm_range
check (arm_cm is null or arm_cm between 10 and 100),
add constraint check_ins_front_photo_path_length
check (
  front_photo_path is null
  or char_length(front_photo_path) between 1 and 500
),
add constraint check_ins_side_photo_path_length
check (
  side_photo_path is null
  or char_length(side_photo_path) between 1 and 500
),
add constraint check_ins_back_photo_path_length
check (
  back_photo_path is null
  or char_length(back_photo_path) between 1 and 500
);

grant insert (
  waist_cm,
  chest_cm,
  hip_cm,
  thigh_cm,
  arm_cm,
  front_photo_path,
  side_photo_path,
  back_photo_path
)
on public.check_ins
to authenticated;

drop policy if exists check_in_photos_select_accessible on storage.objects;
drop policy if exists check_in_photos_insert_own on storage.objects;
drop policy if exists check_in_photos_delete_own on storage.objects;

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
      where workspace.id::text = split_part(storage.objects.name, '/', 1)
        and workspace.owner_id = (select auth.uid())
    )
    or (
      split_part(storage.objects.name, '/', 2) = (select auth.uid())::text
      and exists (
        select 1
        from public.workspace_members as member
        where member.workspace_id::text =
            split_part(storage.objects.name, '/', 1)
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
          and client.workspace_id::text =
              split_part(storage.objects.name, '/', 1)
          and client.user_id = (select auth.uid())
          and client.status = 'active'
      )
    )
  )
);

create policy check_in_photos_delete_own
on storage.objects
for delete
to authenticated
using (
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
);
