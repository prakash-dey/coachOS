alter table public.workspaces
add column is_demo boolean not null default false,
add column demo_expires_at timestamptz;

alter table public.workspaces
add constraint workspaces_demo_expiry_state
check (
  (is_demo and demo_expires_at is not null)
  or (not is_demo and demo_expires_at is null)
);

create index workspaces_demo_expiry_idx
on public.workspaces (demo_expires_at)
where is_demo;

create function private.enforce_anonymous_workspace_type()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
    and not new.is_demo then
    raise exception using
      errcode = '42501',
      message = 'Anonymous users can create demo workspaces only';
  end if;

  return new;
end;
$$;

create trigger workspaces_enforce_anonymous_type
before insert on public.workspaces
for each row
execute function private.enforce_anonymous_workspace_type();

create function private.block_demo_invitations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.workspaces
    where id = new.workspace_id
      and is_demo
  ) then
    raise exception using
      errcode = '42501',
      message = 'Invitations are disabled in demo workspaces';
  end if;

  return new;
end;
$$;

create trigger workspace_invitations_block_demo
before insert on public.workspace_invitations
for each row
execute function private.block_demo_invitations();

create policy check_in_photos_block_demo_uploads
on storage.objects
as restrictive
for insert
to authenticated
with check (
  bucket_id <> 'check-in-photos'
  or not exists (
    select 1
    from public.workspace_members as member
    join public.workspaces as workspace
      on workspace.id = member.workspace_id
    where member.user_id = (select auth.uid())
      and workspace.is_demo
  )
);

create or replace function public.provision_demo_workspace()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  created_workspace_id uuid;
  created_client_id uuid;
  client_ids uuid[] := array[]::uuid[];
  workout_plan_ids uuid[] := array[]::uuid[];
  nutrition_plan_ids uuid[] := array[]::uuid[];
  created_plan_id uuid;
  created_day_id uuid;
  created_meal_id uuid;
  client_names text[] := array[
    'Aarav Mehta', 'Sara Khan', 'Rohan Das', 'Maya Kapoor', 'Kabir Singh',
    'Nisha Rao', 'Arjun Nair', 'Isha Patel', 'Dev Malhotra', 'Tara Sen',
    'Vikram Shah', 'Leena Joseph', 'Neil Fernandes', 'Ananya Bose', 'Reyansh Gupta',
    'Meera Iyer', 'Aditya Jain', 'Zoya Mirza', 'Karan Roy', 'Diya Chawla'
  ];
  workout_names text[] := array[
    '12-week strength foundation', 'Movement reset', 'Hybrid performance'
  ];
  nutrition_names text[] := array[
    'Balanced performance', 'Plant-forward reset', 'Flexible fat loss'
  ];
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception using errcode = '42501', message = 'Anonymous demo session required';
  end if;

  delete from public.workspaces
  where owner_id = current_user_id
    and is_demo
    and demo_expires_at <= now();

  select id
  into created_workspace_id
  from public.workspaces
  where owner_id = current_user_id
    and is_demo
    and demo_expires_at > now();

  if created_workspace_id is not null then
    return created_workspace_id;
  end if;

  insert into public.profiles (id, full_name)
  values (current_user_id, 'Maya Demo')
  on conflict (id) do update set full_name = excluded.full_name;

  insert into public.workspaces (
    name,
    owner_id,
    is_demo,
    demo_expires_at
  ) values (
    'Momentum Coaching',
    current_user_id,
    true,
    now() + interval '6 hours'
  )
  returning id into created_workspace_id;

  insert into public.workspace_members (
    workspace_id,
    user_id,
    role,
    status
  ) values (
    created_workspace_id,
    current_user_id,
    'coach',
    'active'
  );

  for client_index in 1..20 loop
    insert into public.clients (
      workspace_id,
      first_name,
      last_name,
      email,
      phone,
      status,
      timezone
    ) values (
      created_workspace_id,
      split_part(client_names[client_index], ' ', 1),
      split_part(client_names[client_index], ' ', 2),
      lower(replace(client_names[client_index], ' ', '.')) || '@example.com',
      '+91 90000 ' || lpad(client_index::text, 5, '0'),
      case
        when client_index in (9, 17) then 'paused'::public.client_status
        else 'active'::public.client_status
      end,
      'Asia/Kolkata'
    )
    returning id into created_client_id;

    client_ids := array_append(client_ids, created_client_id);

    for week_index in (case when client_index <= 15 then 0 else 1 end)..7 loop
      insert into public.check_ins (
        workspace_id,
        client_id,
        submitted_by,
        week_start,
        weight_kg,
        energy_score,
        mood_score,
        notes,
        coach_feedback,
        reviewed_at,
        submitted_at
      ) values (
        created_workspace_id,
        created_client_id,
        current_user_id,
        date_trunc('week', current_date)::date - (week_index * 7),
        62 + client_index + (week_index * 0.15),
        3 + ((client_index + week_index) % 3),
        3 + ((client_index + week_index + 1) % 3),
        case (client_index + week_index) % 4
          when 0 then 'Training felt strong and recovery was good this week.'
          when 1 then 'Work was busy, but I completed the important sessions.'
          when 2 then 'Energy dipped midweek. Sleep is the main focus next week.'
          else 'Nutrition was consistent and the routine felt sustainable.'
        end,
        case
          when week_index > 0 or client_index <= 8
            then 'Good awareness this week. Keep the next action simple and repeatable.'
          else null
        end,
        case
          when week_index > 0 or client_index <= 8 then now() - (week_index * interval '7 days')
          else null
        end,
        now() - (week_index * interval '7 days')
      );
    end loop;
  end loop;

  for plan_index in 1..3 loop
    insert into public.workout_plans (
      workspace_id,
      name,
      description,
      status,
      created_by
    ) values (
      created_workspace_id,
      workout_names[plan_index],
      'A reusable training system built around progressive, sustainable coaching.',
      'active',
      current_user_id
    ) returning id into created_plan_id;

    workout_plan_ids := array_append(workout_plan_ids, created_plan_id);

    for day_index in 1..(plan_index + 2) loop
      insert into public.workout_days (
        workout_plan_id,
        position,
        name,
        notes
      ) values (
        created_plan_id,
        day_index,
        case day_index % 4
          when 1 then 'Upper body strength'
          when 2 then 'Lower body strength'
          when 3 then 'Conditioning and core'
          else 'Full body movement'
        end,
        'Move with control and finish with two good reps in reserve.'
      ) returning id into created_day_id;

      for item_index in 1..4 loop
        insert into public.workout_exercises (
          workout_day_id,
          position,
          name,
          sets,
          reps,
          rest_seconds
        ) values (
          created_day_id,
          item_index,
          (array['Goblet squat', 'Dumbbell press', 'Romanian deadlift', 'Cable row'])[item_index],
          case when item_index = 1 then 4 else 3 end,
          case when item_index = 1 then '6-8' else '10-12' end,
          case when item_index = 1 then 120 else 75 end
        );
      end loop;
    end loop;
  end loop;

  for client_index in 1..12 loop
    insert into public.workout_plan_assignments (
      workspace_id,
      client_id,
      workout_plan_id,
      assigned_by,
      status,
      starts_on
    ) values (
      created_workspace_id,
      client_ids[client_index],
      workout_plan_ids[1 + ((client_index - 1) % 3)],
      current_user_id,
      'active',
      current_date - ((client_index % 4) * 7)
    );
  end loop;

  for plan_index in 1..3 loop
    insert into public.nutrition_plans (
      workspace_id,
      name,
      description,
      daily_calories,
      protein_grams,
      carbs_grams,
      fat_grams,
      status,
      created_by
    ) values (
      created_workspace_id,
      nutrition_names[plan_index],
      'A flexible food framework with practical portions and simple alternatives.',
      1700 + (plan_index * 250),
      110 + (plan_index * 15),
      180 + (plan_index * 25),
      55 + (plan_index * 5),
      'active',
      current_user_id
    ) returning id into created_plan_id;

    nutrition_plan_ids := array_append(nutrition_plan_ids, created_plan_id);

    for day_index in 1..4 loop
      insert into public.nutrition_meals (
        nutrition_plan_id,
        position,
        name,
        timing
      ) values (
        created_plan_id,
        day_index,
        (array['Breakfast', 'Lunch', 'Afternoon snack', 'Dinner'])[day_index],
        (array['8:00 AM', '1:00 PM', '5:00 PM', '8:00 PM'])[day_index]
      ) returning id into created_meal_id;

      for item_index in 1..2 loop
        insert into public.nutrition_items (
          nutrition_meal_id,
          position,
          name,
          amount,
          alternatives
        ) values (
          created_meal_id,
          item_index,
          case
            when day_index = 1 and item_index = 1 then 'Rolled oats'
            when day_index = 1 then 'Greek yogurt and berries'
            when day_index = 2 and item_index = 1 then 'Rice or roti'
            when day_index = 2 then 'Paneer or chicken with vegetables'
            when day_index = 3 and item_index = 1 then 'Seasonal fruit'
            when day_index = 3 then 'Roasted chana'
            when item_index = 1 then 'Dal and mixed vegetables'
            else 'Rice with salad'
          end,
          case when item_index = 1 then '1 serving' else '150 g' end,
          case when item_index = 1 then 'Choose an equivalent carbohydrate portion.' else 'Swap with tofu or another lean protein.' end
        );
      end loop;
    end loop;
  end loop;

  for client_index in 1..12 loop
    insert into public.nutrition_plan_assignments (
      workspace_id,
      client_id,
      nutrition_plan_id,
      assigned_by,
      status,
      starts_on
    ) values (
      created_workspace_id,
      client_ids[client_index],
      nutrition_plan_ids[1 + ((client_index - 1) % 3)],
      current_user_id,
      'active',
      current_date - ((client_index % 3) * 7)
    );
  end loop;

  return created_workspace_id;
end;
$$;

create or replace function public.enter_demo_client_preview(
  requested_client_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  owned_workspace_id uuid;
begin
  select id into owned_workspace_id
  from public.workspaces
  where owner_id = current_user_id
    and is_demo
    and demo_expires_at > now();

  if owned_workspace_id is null then
    raise exception using errcode = '42501', message = 'Active demo workspace required';
  end if;

  if not exists (
    select 1 from public.clients
    where id = requested_client_id
      and workspace_id = owned_workspace_id
  ) then
    raise exception using errcode = '42501', message = 'Demo client not found';
  end if;

  update public.clients
  set user_id = null
  where workspace_id = owned_workspace_id
    and user_id = current_user_id;

  update public.clients
  set user_id = current_user_id
  where id = requested_client_id;

  update public.workspace_members
  set role = 'client'
  where workspace_id = owned_workspace_id
    and user_id = current_user_id;
end;
$$;

create or replace function public.exit_demo_client_preview()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  owned_workspace_id uuid;
begin
  select id into owned_workspace_id
  from public.workspaces
  where owner_id = current_user_id
    and is_demo;

  if owned_workspace_id is null then
    raise exception using errcode = '42501', message = 'Demo workspace required';
  end if;

  update public.clients
  set user_id = null
  where workspace_id = owned_workspace_id
    and user_id = current_user_id;

  update public.workspace_members
  set role = 'coach'
  where workspace_id = owned_workspace_id
    and user_id = current_user_id;
end;
$$;

create function private.cleanup_expired_demo_workspaces()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired_owner_id uuid;
  deleted_count integer := 0;
begin
  for expired_owner_id in
    select owner_id
    from public.workspaces
    where is_demo
      and demo_expires_at <= now()
  loop
    delete from public.workspaces
    where owner_id = expired_owner_id
      and is_demo;

    delete from auth.users
    where id = expired_owner_id
      and is_anonymous;

    deleted_count := deleted_count + 1;
  end loop;

  return deleted_count;
end;
$$;

revoke all on function public.provision_demo_workspace() from public;
revoke all on function public.enter_demo_client_preview(uuid) from public;
revoke all on function public.exit_demo_client_preview() from public;
revoke all on function private.cleanup_expired_demo_workspaces() from public;

grant execute on function public.provision_demo_workspace() to authenticated;
grant execute on function public.enter_demo_client_preview(uuid) to authenticated;
grant execute on function public.exit_demo_client_preview() to authenticated;

create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'cleanup-expired-coachos-demos',
  '17 * * * *',
  'select private.cleanup_expired_demo_workspaces()'
);
