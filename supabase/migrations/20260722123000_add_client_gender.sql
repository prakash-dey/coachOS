alter table public.clients
add column if not exists gender text not null default 'other';

alter table public.clients
drop constraint if exists clients_gender_valid;

alter table public.clients
add constraint clients_gender_valid
check (gender in ('male', 'female', 'other'));

create or replace function private.demo_client_gender_from_name(client_first_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when client_first_name in (
      'Aarav', 'Rohan', 'Kabir', 'Arjun', 'Dev', 'Vikram',
      'Neil', 'Reyansh', 'Aditya', 'Karan'
    ) then 'male'
    when client_first_name in (
      'Sara', 'Maya', 'Nisha', 'Isha', 'Tara', 'Leena',
      'Ananya', 'Meera', 'Zoya', 'Diya'
    ) then 'female'
    else 'other'
  end;
$$;

update public.clients as client
set gender = private.demo_client_gender_from_name(client.first_name)
where exists (
  select 1
  from public.workspaces as workspace
  where workspace.id = client.workspace_id
    and workspace.is_demo
);

update public.client_intake_forms as intake
set
  front_photo_path = case when client.gender = 'male' then 'images/male_front_view.webp' else 'images/female_front_view.webp' end,
  side_photo_path = case when client.gender = 'male' then 'images/male_side_view.webp' else 'images/female_side_view.webp' end,
  back_photo_path = case when client.gender = 'male' then 'images/male_back_view.webp' else 'images/female_back_view.webp' end
from public.clients as client
join public.workspaces as workspace on workspace.id = client.workspace_id
where intake.workspace_id = client.workspace_id
  and intake.client_id = client.id
  and workspace.is_demo;

update public.check_ins as check_in
set
  front_photo_path = case when client.gender = 'male' then 'images/male_front_view.webp' else 'images/female_front_view.webp' end,
  side_photo_path = case when client.gender = 'male' then 'images/male_side_view.webp' else 'images/female_side_view.webp' end,
  back_photo_path = case when client.gender = 'male' then 'images/male_back_view.webp' else 'images/female_back_view.webp' end
from public.clients as client
join public.workspaces as workspace on workspace.id = client.workspace_id
where check_in.workspace_id = client.workspace_id
  and check_in.client_id = client.id
  and workspace.is_demo;

create or replace function private.set_demo_client_gender()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.gender = 'other'
    and exists (
      select 1
      from public.workspaces as workspace
      where workspace.id = new.workspace_id
        and workspace.is_demo
    ) then
    new.gender := private.demo_client_gender_from_name(new.first_name);
  end if;

  return new;
end;
$$;

drop trigger if exists clients_set_demo_gender on public.clients;

create trigger clients_set_demo_gender
before insert on public.clients
for each row
execute function private.set_demo_client_gender();
