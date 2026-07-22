create or replace function public.enrich_demo_workspace_sample_data(
  target_workspace_id uuid,
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  client_record record;
  client_number integer;
begin
  if target_workspace_id is null or target_user_id is null then
    return;
  end if;

  update public.workout_plans
  set
    description = case name
      when '12-week strength foundation' then 'A progressive 12-week strength block with foundational lifts, movement quality, and simple weekly progression.'
      when 'Movement reset' then 'A low-impact mobility and strength reset for clients rebuilding consistency and pain-free movement.'
      when 'Hybrid performance' then 'A balanced strength and conditioning plan for busy clients who want muscle, stamina, and athletic capacity.'
      else coalesce(description, 'A reusable training system built around progressive, sustainable coaching.')
    end,
    duration_weeks = case name
      when 'Movement reset' then 8
      when 'Hybrid performance' then 10
      else duration_weeks
    end
  where workspace_id = target_workspace_id;

  update public.nutrition_plans
  set
    description = case name
      when 'Balanced performance' then 'High-protein whole-food meals, flexible swaps, hydration targets, and simple portions for training performance.'
      when 'Plant-forward reset' then 'Vegetarian-friendly meals focused on fiber, protein quality, digestion, and consistent energy.'
      when 'Flexible fat loss' then 'A practical calorie-controlled framework with satiating meals and planned flexibility for social eating.'
      else coalesce(description, 'A flexible food framework with practical portions and simple alternatives.')
    end,
    duration_weeks = case name
      when 'Plant-forward reset' then 8
      when 'Flexible fat loss' then 16
      else duration_weeks
    end,
    fiber_grams = case name
      when 'Plant-forward reset' then 38
      when 'Flexible fat loss' then 32
      else 35
    end,
    water_liters = case name
      when 'Hybrid performance' then 3.5
      else 3.0
    end,
    dietary_preference = case name
      when 'Plant-forward reset' then 'Vegetarian'
      else 'Flexible high-protein'
    end,
    allergies = 'None reported in demo data',
    foods_to_avoid = case name
      when 'Flexible fat loss' then 'Sugary drinks, frequent fried snacks'
      else 'None specified'
    end
  where workspace_id = target_workspace_id;

  for client_record in
    select
      client.*,
      row_number() over (order by client.created_at, client.first_name, client.last_name) as sequence_number
    from public.clients as client
    where client.workspace_id = target_workspace_id
    order by client.created_at, client.first_name, client.last_name
  loop
    client_number := client_record.sequence_number;

    update public.clients
    set
      email = lower(client_record.first_name || '.' || client_record.last_name) || '.demo@coachos.test',
      phone = '+91 98765 ' || lpad(client_number::text, 5, '0'),
      timezone = 'Asia/Kolkata'
    where id = client_record.id;

    insert into public.client_intake_forms (
      workspace_id,
      client_id,
      submitted_by,
      primary_goal,
      training_experience,
      activity_level,
      training_days_per_week,
      height_cm,
      weight_kg,
      waist_cm,
      chest_cm,
      hip_cm,
      thigh_cm,
      arm_cm,
      usual_food_habits,
      dietary_preference,
      allergies,
      medical_history,
      injuries_or_limitations,
      medications,
      sleep_hours,
      stress_level,
      emergency_contact_name,
      emergency_contact_phone,
      front_photo_path,
      side_photo_path,
      back_photo_path,
      notes
    )
    values (
      target_workspace_id,
      client_record.id,
      target_user_id,
      case client_number % 5
        when 0 then 'Build lean muscle while keeping conditioning and joint health in a good place.'
        when 1 then 'Lose fat gradually, improve energy, and build a routine that works around office hours.'
        when 2 then 'Get stronger on the main lifts and improve posture from long desk work.'
        when 3 then 'Rebuild training consistency after a long break and improve weekly movement quality.'
        else 'Improve body composition with simple nutrition habits and three focused workouts per week.'
      end,
      (array['beginner', 'intermediate', 'advanced'])[1 + (client_number % 3)],
      (array['sedentary', 'light', 'moderate', 'very_active'])[1 + (client_number % 4)],
      3 + (client_number % 4),
      158 + (client_number % 18),
      55 + client_number + ((client_number % 4) * 1.5),
      72 + (client_number % 18),
      84 + (client_number % 16),
      86 + (client_number % 14),
      48 + (client_number % 10),
      27 + (client_number % 8),
      case client_number % 4
        when 0 then 'Mostly homemade meals, two cups of tea daily, dinner is usually late after work.'
        when 1 then 'Office lunch on weekdays, prefers simple Indian meals, snacks when meetings run long.'
        when 2 then 'High-protein breakfast, mixed home and restaurant meals, struggles with weekend consistency.'
        else 'Vegetarian home food, likes dal, paneer, rice, fruit, and needs quick evening options.'
      end,
      case client_number % 4
        when 0 then 'Flexible'
        when 1 then 'Vegetarian'
        when 2 then 'High-protein non-vegetarian'
        else 'Eggitarian'
      end,
      case client_number % 6
        when 0 then 'Lactose sensitivity'
        when 1 then 'Peanuts'
        else 'None reported'
      end,
      case client_number % 5
        when 0 then 'Occasional lower-back tightness after long sitting. No major medical condition reported.'
        when 1 then 'Mild acidity when meals are skipped. Cleared for moderate exercise.'
        else 'No known medical conditions reported in the demo intake.'
      end,
      case client_number % 5
        when 0 then 'Avoid heavy spinal loading when back feels irritated; prioritize warm-ups.'
        when 1 then 'Old ankle sprain, prefers gradual running volume.'
        else 'No current injuries or movement limitations reported.'
      end,
      case client_number % 7
        when 0 then 'Vitamin D supplement'
        else null
      end,
      6.0 + ((client_number % 5) * 0.5),
      1 + (client_number % 5),
      'Demo emergency contact',
      '+91 99888 ' || lpad(client_number::text, 5, '0'),
      case when client_number % 2 = 0 then 'images/female_front_view.webp' else 'images/male_front_view.webp' end,
      case when client_number % 2 = 0 then 'images/female_side_view.webp' else 'images/male_side_view.webp' end,
      case when client_number % 2 = 0 then 'images/female_back_view.webp' else 'images/male_back_view.webp' end,
      'Generated demo intake for UI preview and testing.'
    )
    on conflict (workspace_id, client_id) do update
    set
      primary_goal = excluded.primary_goal,
      training_experience = excluded.training_experience,
      activity_level = excluded.activity_level,
      training_days_per_week = excluded.training_days_per_week,
      height_cm = excluded.height_cm,
      weight_kg = excluded.weight_kg,
      waist_cm = excluded.waist_cm,
      chest_cm = excluded.chest_cm,
      hip_cm = excluded.hip_cm,
      thigh_cm = excluded.thigh_cm,
      arm_cm = excluded.arm_cm,
      usual_food_habits = excluded.usual_food_habits,
      dietary_preference = excluded.dietary_preference,
      allergies = excluded.allergies,
      medical_history = excluded.medical_history,
      injuries_or_limitations = excluded.injuries_or_limitations,
      medications = excluded.medications,
      sleep_hours = excluded.sleep_hours,
      stress_level = excluded.stress_level,
      emergency_contact_name = excluded.emergency_contact_name,
      emergency_contact_phone = excluded.emergency_contact_phone,
      front_photo_path = excluded.front_photo_path,
      side_photo_path = excluded.side_photo_path,
      back_photo_path = excluded.back_photo_path,
      notes = excluded.notes,
      updated_at = now();

    update public.check_ins
    set
      waist_cm = coalesce(waist_cm, 72 + (client_number % 18)),
      chest_cm = coalesce(chest_cm, 84 + (client_number % 16)),
      hip_cm = coalesce(hip_cm, 86 + (client_number % 14)),
      thigh_cm = coalesce(thigh_cm, 48 + (client_number % 10)),
      arm_cm = coalesce(arm_cm, 27 + (client_number % 8)),
      front_photo_path = case when client_number % 2 = 0 then 'images/female_front_view.webp' else 'images/male_front_view.webp' end,
      side_photo_path = case when client_number % 2 = 0 then 'images/female_side_view.webp' else 'images/male_side_view.webp' end,
      back_photo_path = case when client_number % 2 = 0 then 'images/female_back_view.webp' else 'images/male_back_view.webp' end
    where workspace_id = target_workspace_id
      and client_id = client_record.id;
  end loop;
end;
$$;

revoke all on function public.enrich_demo_workspace_sample_data(uuid, uuid) from public;
grant execute on function public.enrich_demo_workspace_sample_data(uuid, uuid) to authenticated;

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
    perform public.enrich_demo_workspace_sample_data(created_workspace_id, current_user_id);
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
      lower(replace(client_names[client_index], ' ', '.')) || '.demo@coachos.test',
      '+91 98765 ' || lpad(client_index::text, 5, '0'),
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
        waist_cm,
        chest_cm,
        hip_cm,
        thigh_cm,
        arm_cm,
        energy_score,
        mood_score,
        notes,
        coach_feedback,
        front_photo_path,
        side_photo_path,
        back_photo_path,
        reviewed_at,
        submitted_at
      ) values (
        created_workspace_id,
        created_client_id,
        current_user_id,
        date_trunc('week', current_date)::date - (week_index * 7),
        55 + client_index + (week_index * 0.15),
        72 + (client_index % 18),
        84 + (client_index % 16),
        86 + (client_index % 14),
        48 + (client_index % 10),
        27 + (client_index % 8),
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
        case when client_index % 2 = 0 then 'images/female_front_view.webp' else 'images/male_front_view.webp' end,
        case when client_index % 2 = 0 then 'images/female_side_view.webp' else 'images/male_side_view.webp' end,
        case when client_index % 2 = 0 then 'images/female_back_view.webp' else 'images/male_back_view.webp' end,
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
      duration_weeks,
      created_by
    ) values (
      created_workspace_id,
      workout_names[plan_index],
      case plan_index
        when 1 then 'A progressive 12-week strength block with foundational lifts, movement quality, and simple weekly progression.'
        when 2 then 'A low-impact mobility and strength reset for clients rebuilding consistency and pain-free movement.'
        else 'A balanced strength and conditioning plan for busy clients who want muscle, stamina, and athletic capacity.'
      end,
      'active',
      case plan_index when 2 then 8 when 3 then 10 else 12 end,
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
      duration_weeks,
      fiber_grams,
      water_liters,
      dietary_preference,
      allergies,
      foods_to_avoid,
      status,
      created_by
    ) values (
      created_workspace_id,
      nutrition_names[plan_index],
      case plan_index
        when 1 then 'High-protein whole-food meals, flexible swaps, hydration targets, and simple portions for training performance.'
        when 2 then 'Vegetarian-friendly meals focused on fiber, protein quality, digestion, and consistent energy.'
        else 'A practical calorie-controlled framework with satiating meals and planned flexibility for social eating.'
      end,
      1700 + (plan_index * 250),
      110 + (plan_index * 15),
      180 + (plan_index * 25),
      55 + (plan_index * 5),
      case plan_index when 2 then 8 when 3 then 16 else 12 end,
      case plan_index when 2 then 38 when 3 then 32 else 35 end,
      case plan_index when 3 then 3.2 else 3.0 end,
      case plan_index when 2 then 'Vegetarian' else 'Flexible high-protein' end,
      'None reported in demo data',
      case plan_index when 3 then 'Sugary drinks, frequent fried snacks' else 'None specified' end,
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
        (array['08:00', '13:00', '17:00', '20:00'])[day_index]
      ) returning id into created_meal_id;

      for item_index in 1..2 loop
        insert into public.nutrition_items (
          nutrition_meal_id,
          position,
          name,
          amount,
          alternatives,
          calories,
          protein_grams,
          carbs_grams,
          fat_grams
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
          case when item_index = 1 then 'Choose an equivalent carbohydrate portion.' else 'Swap with tofu or another lean protein.' end,
          case when item_index = 1 then 280 else 220 end,
          case when item_index = 1 then 12 else 24 end,
          case when item_index = 1 then 36 else 16 end,
          case when item_index = 1 then 8 else 10 end
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

  perform public.enrich_demo_workspace_sample_data(created_workspace_id, current_user_id);

  return created_workspace_id;
end;
$$;

revoke all on function public.provision_demo_workspace() from public;
grant execute on function public.provision_demo_workspace() to authenticated;
