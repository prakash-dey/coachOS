


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."client_status" AS ENUM (
    'active',
    'paused',
    'archived'
);


ALTER TYPE "public"."client_status" OWNER TO "postgres";


CREATE TYPE "public"."invitation_status" AS ENUM (
    'pending',
    'accepted',
    'expired',
    'revoked'
);


ALTER TYPE "public"."invitation_status" OWNER TO "postgres";


CREATE TYPE "public"."membership_status" AS ENUM (
    'active',
    'suspended'
);


ALTER TYPE "public"."membership_status" OWNER TO "postgres";


CREATE TYPE "public"."nutrition_assignment_status" AS ENUM (
    'active',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."nutrition_assignment_status" OWNER TO "postgres";


CREATE TYPE "public"."nutrition_plan_status" AS ENUM (
    'draft',
    'active',
    'archived'
);


ALTER TYPE "public"."nutrition_plan_status" OWNER TO "postgres";


CREATE TYPE "public"."workout_assignment_status" AS ENUM (
    'active',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."workout_assignment_status" OWNER TO "postgres";


CREATE TYPE "public"."workout_plan_status" AS ENUM (
    'draft',
    'active',
    'archived'
);


ALTER TYPE "public"."workout_plan_status" OWNER TO "postgres";


CREATE TYPE "public"."workspace_approval_status" AS ENUM (
    'pending_review',
    'approved',
    'rejected'
);


ALTER TYPE "public"."workspace_approval_status" OWNER TO "postgres";


CREATE TYPE "public"."workspace_role" AS ENUM (
    'coach',
    'client'
);


ALTER TYPE "public"."workspace_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."approve_demo_workspace_on_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if new.is_demo then
    new.approval_status := 'approved';
    new.approval_reviewed_at := coalesce(new.approval_reviewed_at, now());
  end if;

  return new;
end;
$$;


ALTER FUNCTION "private"."approve_demo_workspace_on_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."block_demo_invitations"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."block_demo_invitations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."can_access_nutrition_meal"("target_meal_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (select 1 from public.nutrition_meals m where m.id = target_meal_id and private.can_access_nutrition_plan(m.nutrition_plan_id));
$$;


ALTER FUNCTION "private"."can_access_nutrition_meal"("target_meal_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."can_access_nutrition_plan"("target_plan_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select private.is_nutrition_plan_owner(target_plan_id) or exists (
    select 1 from public.nutrition_plan_assignments a
    join public.clients c on c.id = a.client_id and c.workspace_id = a.workspace_id
    where a.nutrition_plan_id = target_plan_id and a.status = 'active'
      and current_date between a.starts_on and a.ends_on
      and c.status = 'active' and c.user_id = (select auth.uid())
      and private.is_active_workspace_member(a.workspace_id)
  );
$$;


ALTER FUNCTION "private"."can_access_nutrition_plan"("target_plan_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."can_access_workout_day"("target_day_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.workout_days as day
    where day.id = target_day_id
      and private.can_access_workout_plan(day.workout_plan_id)
  );
$$;


ALTER FUNCTION "private"."can_access_workout_day"("target_day_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."can_access_workout_plan"("target_plan_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select private.is_workout_plan_owner(target_plan_id) or exists (
    select 1 from public.workout_plan_assignments a
    join public.clients c on c.id = a.client_id and c.workspace_id = a.workspace_id
    where a.workout_plan_id = target_plan_id and a.status = 'active'
      and current_date between a.starts_on and a.ends_on
      and c.status = 'active' and c.user_id = (select auth.uid())
      and private.is_active_workspace_member(a.workspace_id)
  );
$$;


ALTER FUNCTION "private"."can_access_workout_plan"("target_plan_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."cleanup_expired_demo_workspaces"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."cleanup_expired_demo_workspaces"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."demo_client_gender_from_name"("client_first_name" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."demo_client_gender_from_name"("client_first_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."enforce_anonymous_workspace_type"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."enforce_anonymous_workspace_type"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_active_workspace_member"("target_workspace_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = (select auth.uid())
      and status = 'active'
  );
$$;


ALTER FUNCTION "private"."is_active_workspace_member"("target_workspace_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_nutrition_meal_owner"("target_meal_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (select 1 from public.nutrition_meals m where m.id = target_meal_id and private.is_nutrition_plan_owner(m.nutrition_plan_id));
$$;


ALTER FUNCTION "private"."is_nutrition_meal_owner"("target_meal_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_nutrition_plan_owner"("target_plan_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (select 1 from public.nutrition_plans p join public.workspaces w on w.id = p.workspace_id where p.id = target_plan_id and w.owner_id = (select auth.uid()));
$$;


ALTER FUNCTION "private"."is_nutrition_plan_owner"("target_plan_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_super_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.super_admins
    where user_id = (select auth.uid())
  );
$$;


ALTER FUNCTION "private"."is_super_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_workout_day_owner"("target_day_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.workout_days as day
    where day.id = target_day_id
      and private.is_workout_plan_owner(day.workout_plan_id)
  );
$$;


ALTER FUNCTION "private"."is_workout_day_owner"("target_day_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_workout_plan_owner"("target_plan_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.workout_plans as plan
    join public.workspaces as workspace
      on workspace.id = plan.workspace_id
    where plan.id = target_plan_id
      and workspace.owner_id = (select auth.uid())
  );
$$;


ALTER FUNCTION "private"."is_workout_plan_owner"("target_plan_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_workspace_owner"("target_workspace_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.workspaces
    where id = target_workspace_id
      and owner_id = (select auth.uid())
      and (
        is_demo
        or approval_status = 'approved'
      )
  );
$$;


ALTER FUNCTION "private"."is_workspace_owner"("target_workspace_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."prevent_workspace_approval_self_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if old.owner_id = (select auth.uid())
    and old.approval_status = 'rejected'
    and new.approval_status = 'pending_review'
    and new.approval_reviewed_at is null
    and new.approval_reviewed_by is null
    and new.approval_note is null then
    return new;
  end if;

  if (
    old.approval_status is distinct from new.approval_status
    or old.approval_reviewed_at is distinct from new.approval_reviewed_at
    or old.approval_reviewed_by is distinct from new.approval_reviewed_by
    or old.approval_note is distinct from new.approval_note
  ) and not private.is_super_admin() then
    raise exception using
      errcode = '42501',
      message = 'Only super admins can review workspaces';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "private"."prevent_workspace_approval_self_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."set_demo_client_gender"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."set_demo_client_gender"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "private"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_client_invitation"("invitation_token" "text") RETURNS TABLE("accepted_client_id" "uuid", "accepted_workspace_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  current_user_id uuid := auth.uid();
  current_user_email text;
  invitation_record record;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if invitation_token !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid invitation';
  end if;

  select auth_user.email into current_user_email
  from auth.users as auth_user
  where auth_user.id = current_user_id;

  if current_user_email is null then
    raise exception using errcode = '42501', message = 'A verified email is required';
  end if;

  select
    invitation.id as invitation_id,
    invitation.client_id,
    invitation.workspace_id,
    client.user_id as existing_client_user_id,
    client.first_name,
    client.last_name
  into invitation_record
  from public.workspace_invitations as invitation
  join public.clients as client
    on client.id = invitation.client_id
    and client.workspace_id = invitation.workspace_id
  where invitation.token_hash = encode(extensions.digest(invitation_token, 'sha256'), 'hex')
    and invitation.status = 'pending'
    and invitation.expires_at > now()
    and client.status = 'active'
  for update of invitation, client;

  if not found then
    raise exception using errcode = 'P0001', message = 'Invitation is invalid or expired';
  end if;

  if invitation_record.existing_client_user_id is not null
    and invitation_record.existing_client_user_id <> current_user_id then
    raise exception using errcode = '42501', message = 'Client is already linked to another user';
  end if;

  if exists (
    select 1
    from public.workspace_members
    where user_id = current_user_id
      and workspace_id = invitation_record.workspace_id
  ) then
    raise exception using errcode = '23505', message = 'User already belongs to this workspace';
  end if;

  insert into public.profiles (id, full_name)
  values (
    current_user_id,
    left(btrim(concat_ws(' ', invitation_record.first_name, invitation_record.last_name)), 120)
  )
  on conflict (id) do nothing;

  update public.clients
  set user_id = current_user_id,
      email = lower(btrim(current_user_email))
  where id = invitation_record.client_id
    and workspace_id = invitation_record.workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role, status)
  values (invitation_record.workspace_id, current_user_id, 'client', 'active');

  update public.workspace_invitations
  set status = 'accepted',
      accepted_by = current_user_id,
      accepted_at = now()
  where id = invitation_record.invitation_id;

  return query select invitation_record.client_id, invitation_record.workspace_id;
end;
$_$;


ALTER FUNCTION "public"."accept_client_invitation"("invitation_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_coach_onboarding"("full_name" "text", "workspace_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
    owner_id,
    approval_status
  )
  values (
    btrim(workspace_name),
    current_user_id,
    'pending_review'
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


ALTER FUNCTION "public"."complete_coach_onboarding"("full_name" "text", "workspace_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_client_invitation"("requested_client_id" "uuid") RETURNS TABLE("token" "text", "invitation_expires_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  current_user_id uuid := auth.uid();
  owned_workspace_id uuid;
  generated_token text;
  expiration_time timestamptz := now() + interval '24 hours';
begin
  if current_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication required';
  end if;

  select client.workspace_id
  into owned_workspace_id
  from public.clients as client
  join public.workspaces as workspace
    on workspace.id = client.workspace_id
  where client.id = requested_client_id
    and workspace.owner_id = current_user_id
    and client.status = 'active';

  if owned_workspace_id is null then
    raise exception using
      errcode = '42501',
      message = 'Client is not eligible for an invitation';
  end if;

  update public.workspace_invitations
  set status = 'revoked'
  where client_id = requested_client_id
    and status = 'pending';

  generated_token :=
    encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.workspace_invitations (
    workspace_id,
    client_id,
    created_by,
    token_hash,
    status,
    expires_at
  )
  values (
    owned_workspace_id,
    requested_client_id,
    current_user_id,
    encode(
      extensions.digest(generated_token, 'sha256'),
      'hex'
    ),
    'pending',
    expiration_time
  );

  return query
  select generated_token, expiration_time;
end;
$$;


ALTER FUNCTION "public"."create_client_invitation"("requested_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_nutrition_plan"("requested_name" "text", "requested_description" "text", "requested_daily_calories" integer, "requested_protein_grams" integer, "requested_carbs_grams" integer, "requested_fat_grams" integer, "requested_duration_weeks" integer, "requested_fiber_grams" integer, "requested_water_liters" numeric, "requested_dietary_preference" "text", "requested_allergies" "text", "requested_foods_to_avoid" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  current_user_id uuid := auth.uid();
  owned_workspace_id uuid;
  created_plan_id uuid;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if char_length(coalesce(nullif(btrim(requested_name), ''), 'Balanced nutrition plan')) not between 1 and 120
    or coalesce(requested_duration_weeks, 12) not between 1 and 104 then
    raise exception using errcode = '22023', message = 'Invalid nutrition plan';
  end if;
  if requested_description is not null and char_length(btrim(requested_description)) > 5000 then
    raise exception using errcode = '22023', message = 'Invalid nutrition strategy';
  end if;

  select id into owned_workspace_id from public.workspaces where owner_id = current_user_id;
  if owned_workspace_id is null then
    raise exception using errcode = '42501', message = 'Coach workspace required';
  end if;

  insert into public.nutrition_plans (
    workspace_id, name, description, daily_calories, protein_grams,
    carbs_grams, fat_grams, duration_weeks, fiber_grams, water_liters,
    dietary_preference, allergies, foods_to_avoid, created_by
  ) values (
    owned_workspace_id,
    coalesce(nullif(btrim(requested_name), ''), 'Balanced nutrition plan'),
    coalesce(nullif(btrim(requested_description), ''), 'Balanced whole-food plan with flexible meal swaps.'),
    coalesce(nullif(requested_daily_calories, 0), 2200),
    coalesce(requested_protein_grams, 140),
    coalesce(requested_carbs_grams, 250),
    coalesce(requested_fat_grams, 70),
    coalesce(requested_duration_weeks, 12),
    coalesce(requested_fiber_grams, 30),
    coalesce(nullif(requested_water_liters, 0), 3.0),
    coalesce(nullif(btrim(requested_dietary_preference), ''), 'Flexible'),
    coalesce(nullif(btrim(requested_allergies), ''), 'None reported'),
    coalesce(nullif(btrim(requested_foods_to_avoid), ''), 'None specified'),
    current_user_id
  ) returning id into created_plan_id;
  return created_plan_id;
end;
$$;


ALTER FUNCTION "public"."create_nutrition_plan"("requested_name" "text", "requested_description" "text", "requested_daily_calories" integer, "requested_protein_grams" integer, "requested_carbs_grams" integer, "requested_fat_grams" integer, "requested_duration_weeks" integer, "requested_fiber_grams" integer, "requested_water_liters" numeric, "requested_dietary_preference" "text", "requested_allergies" "text", "requested_foods_to_avoid" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_workout_plan"("requested_name" "text", "requested_description" "text", "requested_duration_weeks" integer) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  current_user_id uuid := auth.uid();
  owned_workspace_id uuid;
  created_plan_id uuid;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if char_length(btrim(coalesce(requested_name, ''))) not between 1 and 120
    or requested_duration_weeks not between 1 and 104 then
    raise exception using errcode = '22023', message = 'Invalid workout plan';
  end if;
  if requested_description is not null and char_length(btrim(requested_description)) > 5000 then
    raise exception using errcode = '22023', message = 'Invalid workout plan description';
  end if;

  select id into owned_workspace_id
  from public.workspaces
  where owner_id = current_user_id;
  if owned_workspace_id is null then
    raise exception using errcode = '42501', message = 'Coach workspace required';
  end if;

  insert into public.workout_plans (workspace_id, name, description, duration_weeks, created_by)
  values (owned_workspace_id, btrim(requested_name), nullif(btrim(requested_description), ''), requested_duration_weeks, current_user_id)
  returning id into created_plan_id;
  return created_plan_id;
end;
$$;


ALTER FUNCTION "public"."create_workout_plan"("requested_name" "text", "requested_description" "text", "requested_duration_weeks" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_client"("target_client_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  current_user_id uuid := auth.uid();
  target_workspace_id uuid;
  target_user_id uuid;
begin
  select client.workspace_id, client.user_id
  into target_workspace_id, target_user_id
  from public.clients as client
  join public.workspaces as workspace on workspace.id = client.workspace_id
  where client.id = target_client_id and workspace.owner_id = current_user_id;
  if target_workspace_id is null then
    raise exception using errcode = '42501', message = 'Client not found';
  end if;

  delete from public.clients where id = target_client_id;
  if target_user_id is not null then
    delete from public.workspace_members
    where workspace_id = target_workspace_id and user_id = target_user_id and role = 'client';
  end if;
end;
$$;


ALTER FUNCTION "public"."delete_client"("target_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enrich_demo_workspace_sample_data"("target_workspace_id" "uuid", "target_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."enrich_demo_workspace_sample_data"("target_workspace_id" "uuid", "target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enter_demo_client_preview"("requested_client_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."enter_demo_client_preview"("requested_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."exit_demo_client_preview"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."exit_demo_client_preview"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."preview_client_invitation"("invitation_token" "text") RETURNS TABLE("workspace_name" "text", "client_first_name" "text", "invitation_expires_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
  select
    workspace.name,
    client.first_name,
    invitation.expires_at
  from public.workspace_invitations as invitation
  join public.workspaces as workspace
    on workspace.id = invitation.workspace_id
  join public.clients as client
    on client.id = invitation.client_id
  where invitation_token ~ '^[0-9a-f]{64}$'
    and invitation.token_hash = encode(
      extensions.digest(invitation_token, 'sha256'),
      'hex'
    )
    and invitation.status = 'pending'
    and invitation.expires_at > now()
  limit 1;
$_$;


ALTER FUNCTION "public"."preview_client_invitation"("invitation_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."provision_demo_workspace"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."provision_demo_workspace"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_workspace_review_again"("full_name" "text", "workspace_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  current_user_id uuid := auth.uid();
  target_workspace_id uuid;
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

  select id
  into target_workspace_id
  from public.workspaces
  where owner_id = current_user_id
    and approval_status = 'rejected'
    and not is_demo;

  if target_workspace_id is null then
    raise exception using
      errcode = '42501',
      message = 'Only rejected workspaces can request another review';
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

  update public.workspaces
  set
    name = btrim(workspace_name),
    approval_status = 'pending_review',
    approval_reviewed_at = null,
    approval_reviewed_by = null,
    approval_note = null
  where id = target_workspace_id
    and owner_id = current_user_id
    and approval_status = 'rejected'
  returning id into target_workspace_id;

  return target_workspace_id;
end;
$$;


ALTER FUNCTION "public"."request_workspace_review_again"("full_name" "text", "workspace_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_client_status"("target_client_id" "uuid", "requested_status" "public"."client_status") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  current_user_id uuid := auth.uid();
  target_workspace_id uuid;
  target_user_id uuid;
begin
  select client.workspace_id, client.user_id
  into target_workspace_id, target_user_id
  from public.clients as client
  join public.workspaces as workspace on workspace.id = client.workspace_id
  where client.id = target_client_id and workspace.owner_id = current_user_id;
  if target_workspace_id is null then
    raise exception using errcode = '42501', message = 'Client not found';
  end if;

  update public.clients set status = requested_status where id = target_client_id;
  if target_user_id is not null then
    update public.workspace_members
    set status = case when requested_status = 'active' then 'active'::public.membership_status else 'suspended'::public.membership_status end
    where workspace_id = target_workspace_id and user_id = target_user_id and role = 'client';
  end if;
end;
$$;


ALTER FUNCTION "public"."set_client_status"("target_client_id" "uuid", "requested_status" "public"."client_status") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."check_ins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "submitted_by" "uuid" NOT NULL,
    "week_start" "date" NOT NULL,
    "weight_kg" numeric(5,2),
    "energy_score" smallint NOT NULL,
    "mood_score" smallint NOT NULL,
    "notes" "text",
    "coach_feedback" "text",
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "progress_photo_path" "text",
    "waist_cm" numeric(6,2),
    "chest_cm" numeric(6,2),
    "hip_cm" numeric(6,2),
    "thigh_cm" numeric(6,2),
    "arm_cm" numeric(6,2),
    "front_photo_path" "text",
    "side_photo_path" "text",
    "back_photo_path" "text",
    CONSTRAINT "check_ins_arm_cm_range" CHECK ((("arm_cm" IS NULL) OR (("arm_cm" >= (10)::numeric) AND ("arm_cm" <= (100)::numeric)))),
    CONSTRAINT "check_ins_back_photo_path_length" CHECK ((("back_photo_path" IS NULL) OR (("char_length"("back_photo_path") >= 1) AND ("char_length"("back_photo_path") <= 500)))),
    CONSTRAINT "check_ins_chest_cm_range" CHECK ((("chest_cm" IS NULL) OR (("chest_cm" >= (30)::numeric) AND ("chest_cm" <= (250)::numeric)))),
    CONSTRAINT "check_ins_energy_range" CHECK ((("energy_score" >= 1) AND ("energy_score" <= 5))),
    CONSTRAINT "check_ins_feedback_length" CHECK ((("coach_feedback" IS NULL) OR (("char_length"("btrim"("coach_feedback")) >= 1) AND ("char_length"("btrim"("coach_feedback")) <= 3000)))),
    CONSTRAINT "check_ins_front_photo_path_length" CHECK ((("front_photo_path" IS NULL) OR (("char_length"("front_photo_path") >= 1) AND ("char_length"("front_photo_path") <= 500)))),
    CONSTRAINT "check_ins_hip_cm_range" CHECK ((("hip_cm" IS NULL) OR (("hip_cm" >= (30)::numeric) AND ("hip_cm" <= (250)::numeric)))),
    CONSTRAINT "check_ins_mood_range" CHECK ((("mood_score" >= 1) AND ("mood_score" <= 5))),
    CONSTRAINT "check_ins_notes_length" CHECK ((("notes" IS NULL) OR (("char_length"("btrim"("notes")) >= 1) AND ("char_length"("btrim"("notes")) <= 3000)))),
    CONSTRAINT "check_ins_progress_photo_path_length" CHECK ((("progress_photo_path" IS NULL) OR (("char_length"("progress_photo_path") >= 1) AND ("char_length"("progress_photo_path") <= 500)))),
    CONSTRAINT "check_ins_review_state" CHECK (((("coach_feedback" IS NULL) AND ("reviewed_at" IS NULL)) OR (("coach_feedback" IS NOT NULL) AND ("reviewed_at" IS NOT NULL)))),
    CONSTRAINT "check_ins_side_photo_path_length" CHECK ((("side_photo_path" IS NULL) OR (("char_length"("side_photo_path") >= 1) AND ("char_length"("side_photo_path") <= 500)))),
    CONSTRAINT "check_ins_thigh_cm_range" CHECK ((("thigh_cm" IS NULL) OR (("thigh_cm" >= (20)::numeric) AND ("thigh_cm" <= (150)::numeric)))),
    CONSTRAINT "check_ins_waist_cm_range" CHECK ((("waist_cm" IS NULL) OR (("waist_cm" >= (30)::numeric) AND ("waist_cm" <= (250)::numeric)))),
    CONSTRAINT "check_ins_week_starts_monday" CHECK ((EXTRACT(isodow FROM "week_start") = (1)::numeric)),
    CONSTRAINT "check_ins_weight_range" CHECK ((("weight_kg" IS NULL) OR (("weight_kg" >= (20)::numeric) AND ("weight_kg" <= (500)::numeric))))
);


ALTER TABLE "public"."check_ins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_intake_forms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "submitted_by" "uuid" NOT NULL,
    "primary_goal" "text" NOT NULL,
    "training_experience" "text" NOT NULL,
    "activity_level" "text" NOT NULL,
    "training_days_per_week" smallint NOT NULL,
    "height_cm" numeric(5,2) NOT NULL,
    "weight_kg" numeric(6,2) NOT NULL,
    "waist_cm" numeric(6,2) NOT NULL,
    "chest_cm" numeric(6,2),
    "hip_cm" numeric(6,2),
    "thigh_cm" numeric(6,2),
    "arm_cm" numeric(6,2),
    "usual_food_habits" "text" NOT NULL,
    "dietary_preference" "text" NOT NULL,
    "allergies" "text" NOT NULL,
    "medical_history" "text" NOT NULL,
    "injuries_or_limitations" "text" NOT NULL,
    "medications" "text",
    "sleep_hours" numeric(3,1),
    "stress_level" smallint,
    "emergency_contact_name" "text" NOT NULL,
    "emergency_contact_phone" "text" NOT NULL,
    "front_photo_path" "text" NOT NULL,
    "side_photo_path" "text" NOT NULL,
    "back_photo_path" "text" NOT NULL,
    "notes" "text",
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "document_pdf_path" "text",
    CONSTRAINT "client_intake_forms_activity_level_check" CHECK (("activity_level" = ANY (ARRAY['sedentary'::"text", 'light'::"text", 'moderate'::"text", 'very_active'::"text"]))),
    CONSTRAINT "client_intake_forms_allergies_check" CHECK ((("char_length"("btrim"("allergies")) >= 2) AND ("char_length"("btrim"("allergies")) <= 1000))),
    CONSTRAINT "client_intake_forms_arm_cm_check" CHECK ((("arm_cm" IS NULL) OR (("arm_cm" >= (10)::numeric) AND ("arm_cm" <= (100)::numeric)))),
    CONSTRAINT "client_intake_forms_back_photo_path_check" CHECK ((("char_length"("back_photo_path") >= 1) AND ("char_length"("back_photo_path") <= 500))),
    CONSTRAINT "client_intake_forms_chest_cm_check" CHECK ((("chest_cm" IS NULL) OR (("chest_cm" >= (30)::numeric) AND ("chest_cm" <= (250)::numeric)))),
    CONSTRAINT "client_intake_forms_dietary_preference_check" CHECK ((("char_length"("btrim"("dietary_preference")) >= 2) AND ("char_length"("btrim"("dietary_preference")) <= 120))),
    CONSTRAINT "client_intake_forms_document_pdf_path_check" CHECK ((("document_pdf_path" IS NULL) OR (("char_length"("document_pdf_path") >= 1) AND ("char_length"("document_pdf_path") <= 500)))),
    CONSTRAINT "client_intake_forms_emergency_contact_name_check" CHECK ((("char_length"("btrim"("emergency_contact_name")) >= 2) AND ("char_length"("btrim"("emergency_contact_name")) <= 120))),
    CONSTRAINT "client_intake_forms_emergency_contact_phone_check" CHECK ((("char_length"("btrim"("emergency_contact_phone")) >= 3) AND ("char_length"("btrim"("emergency_contact_phone")) <= 32))),
    CONSTRAINT "client_intake_forms_front_photo_path_check" CHECK ((("char_length"("front_photo_path") >= 1) AND ("char_length"("front_photo_path") <= 500))),
    CONSTRAINT "client_intake_forms_height_cm_check" CHECK ((("height_cm" >= (90)::numeric) AND ("height_cm" <= (250)::numeric))),
    CONSTRAINT "client_intake_forms_hip_cm_check" CHECK ((("hip_cm" IS NULL) OR (("hip_cm" >= (30)::numeric) AND ("hip_cm" <= (250)::numeric)))),
    CONSTRAINT "client_intake_forms_injuries_or_limitations_check" CHECK ((("char_length"("btrim"("injuries_or_limitations")) >= 2) AND ("char_length"("btrim"("injuries_or_limitations")) <= 1500))),
    CONSTRAINT "client_intake_forms_medical_history_check" CHECK ((("char_length"("btrim"("medical_history")) >= 2) AND ("char_length"("btrim"("medical_history")) <= 1500))),
    CONSTRAINT "client_intake_forms_medications_check" CHECK ((("medications" IS NULL) OR (("char_length"("btrim"("medications")) >= 2) AND ("char_length"("btrim"("medications")) <= 1000)))),
    CONSTRAINT "client_intake_forms_notes_check" CHECK ((("notes" IS NULL) OR (("char_length"("btrim"("notes")) >= 2) AND ("char_length"("btrim"("notes")) <= 1500)))),
    CONSTRAINT "client_intake_forms_primary_goal_check" CHECK ((("char_length"("btrim"("primary_goal")) >= 3) AND ("char_length"("btrim"("primary_goal")) <= 500))),
    CONSTRAINT "client_intake_forms_side_photo_path_check" CHECK ((("char_length"("side_photo_path") >= 1) AND ("char_length"("side_photo_path") <= 500))),
    CONSTRAINT "client_intake_forms_sleep_hours_check" CHECK ((("sleep_hours" IS NULL) OR (("sleep_hours" >= (0)::numeric) AND ("sleep_hours" <= (16)::numeric)))),
    CONSTRAINT "client_intake_forms_stress_level_check" CHECK ((("stress_level" IS NULL) OR (("stress_level" >= 1) AND ("stress_level" <= 5)))),
    CONSTRAINT "client_intake_forms_thigh_cm_check" CHECK ((("thigh_cm" IS NULL) OR (("thigh_cm" >= (20)::numeric) AND ("thigh_cm" <= (150)::numeric)))),
    CONSTRAINT "client_intake_forms_training_days_per_week_check" CHECK ((("training_days_per_week" >= 1) AND ("training_days_per_week" <= 7))),
    CONSTRAINT "client_intake_forms_training_experience_check" CHECK (("training_experience" = ANY (ARRAY['beginner'::"text", 'intermediate'::"text", 'advanced'::"text"]))),
    CONSTRAINT "client_intake_forms_usual_food_habits_check" CHECK ((("char_length"("btrim"("usual_food_habits")) >= 3) AND ("char_length"("btrim"("usual_food_habits")) <= 1000))),
    CONSTRAINT "client_intake_forms_waist_cm_check" CHECK ((("waist_cm" >= (30)::numeric) AND ("waist_cm" <= (250)::numeric))),
    CONSTRAINT "client_intake_forms_weight_kg_check" CHECK ((("weight_kg" >= (20)::numeric) AND ("weight_kg" <= (500)::numeric)))
);


ALTER TABLE "public"."client_intake_forms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "status" "public"."client_status" DEFAULT 'active'::"public"."client_status" NOT NULL,
    "timezone" "text" DEFAULT 'UTC'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "gender" "text" DEFAULT 'other'::"text" NOT NULL,
    CONSTRAINT "clients_email_length" CHECK ((("email" IS NULL) OR (("char_length"("btrim"("email")) >= 3) AND ("char_length"("btrim"("email")) <= 254)))),
    CONSTRAINT "clients_first_name_length" CHECK ((("char_length"("btrim"("first_name")) >= 1) AND ("char_length"("btrim"("first_name")) <= 100))),
    CONSTRAINT "clients_gender_valid" CHECK (("gender" = ANY (ARRAY['male'::"text", 'female'::"text", 'other'::"text"]))),
    CONSTRAINT "clients_last_name_length" CHECK ((("char_length"("btrim"("last_name")) >= 1) AND ("char_length"("btrim"("last_name")) <= 100))),
    CONSTRAINT "clients_phone_length" CHECK ((("phone" IS NULL) OR (("char_length"("btrim"("phone")) >= 3) AND ("char_length"("btrim"("phone")) <= 32)))),
    CONSTRAINT "clients_timezone_length" CHECK ((("char_length"("btrim"("timezone")) >= 1) AND ("char_length"("btrim"("timezone")) <= 100)))
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nutrition_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nutrition_meal_id" "uuid" NOT NULL,
    "position" smallint NOT NULL,
    "name" "text" NOT NULL,
    "amount" "text" NOT NULL,
    "alternatives" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "calories" integer DEFAULT 250,
    "protein_grams" integer DEFAULT 20,
    "carbs_grams" integer DEFAULT 30,
    "fat_grams" integer DEFAULT 8,
    CONSTRAINT "nutrition_items_alternatives_check" CHECK ((("alternatives" IS NULL) OR (("char_length"("btrim"("alternatives")) >= 1) AND ("char_length"("btrim"("alternatives")) <= 1000)))),
    CONSTRAINT "nutrition_items_amount_check" CHECK ((("char_length"("btrim"("amount")) >= 1) AND ("char_length"("btrim"("amount")) <= 80))),
    CONSTRAINT "nutrition_items_calories_check" CHECK ((("calories" IS NULL) OR (("calories" >= 0) AND ("calories" <= 5000)))),
    CONSTRAINT "nutrition_items_carbs_grams_check" CHECK ((("carbs_grams" IS NULL) OR (("carbs_grams" >= 0) AND ("carbs_grams" <= 800)))),
    CONSTRAINT "nutrition_items_fat_grams_check" CHECK ((("fat_grams" IS NULL) OR (("fat_grams" >= 0) AND ("fat_grams" <= 300)))),
    CONSTRAINT "nutrition_items_name_check" CHECK ((("char_length"("btrim"("name")) >= 1) AND ("char_length"("btrim"("name")) <= 160))),
    CONSTRAINT "nutrition_items_position_check" CHECK ((("position" >= 1) AND ("position" <= 50))),
    CONSTRAINT "nutrition_items_protein_grams_check" CHECK ((("protein_grams" IS NULL) OR (("protein_grams" >= 0) AND ("protein_grams" <= 500))))
);


ALTER TABLE "public"."nutrition_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nutrition_meals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nutrition_plan_id" "uuid" NOT NULL,
    "position" smallint NOT NULL,
    "name" "text" NOT NULL,
    "timing" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "nutrition_meals_name_check" CHECK ((("char_length"("btrim"("name")) >= 1) AND ("char_length"("btrim"("name")) <= 120))),
    CONSTRAINT "nutrition_meals_notes_check" CHECK ((("notes" IS NULL) OR (("char_length"("btrim"("notes")) >= 1) AND ("char_length"("btrim"("notes")) <= 3000)))),
    CONSTRAINT "nutrition_meals_position_check" CHECK ((("position" >= 1) AND ("position" <= 20))),
    CONSTRAINT "nutrition_meals_timing_check" CHECK ((("timing" IS NULL) OR (("char_length"("btrim"("timing")) >= 1) AND ("char_length"("btrim"("timing")) <= 80))))
);


ALTER TABLE "public"."nutrition_meals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nutrition_plan_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "nutrition_plan_id" "uuid" NOT NULL,
    "assigned_by" "uuid" NOT NULL,
    "status" "public"."nutrition_assignment_status" DEFAULT 'active'::"public"."nutrition_assignment_status" NOT NULL,
    "starts_on" "date" DEFAULT CURRENT_DATE NOT NULL,
    "ends_on" "date" DEFAULT (CURRENT_DATE + 83) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "nutrition_plan_assignments_check" CHECK ((("ends_on" IS NULL) OR ("ends_on" >= "starts_on")))
);


ALTER TABLE "public"."nutrition_plan_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nutrition_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "daily_calories" integer,
    "protein_grams" integer,
    "carbs_grams" integer,
    "fat_grams" integer,
    "status" "public"."nutrition_plan_status" DEFAULT 'draft'::"public"."nutrition_plan_status" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "duration_weeks" smallint DEFAULT 12 NOT NULL,
    "fiber_grams" integer DEFAULT 30,
    "water_liters" numeric(4,1) DEFAULT 3.0,
    "dietary_preference" "text" DEFAULT 'Flexible'::"text",
    "allergies" "text" DEFAULT 'None reported'::"text",
    "foods_to_avoid" "text" DEFAULT 'None specified'::"text",
    CONSTRAINT "nutrition_plans_allergies_check" CHECK ((("allergies" IS NULL) OR (("char_length"("btrim"("allergies")) >= 1) AND ("char_length"("btrim"("allergies")) <= 1000)))),
    CONSTRAINT "nutrition_plans_carbs_grams_check" CHECK ((("carbs_grams" IS NULL) OR (("carbs_grams" >= 0) AND ("carbs_grams" <= 1500)))),
    CONSTRAINT "nutrition_plans_daily_calories_check" CHECK ((("daily_calories" IS NULL) OR (("daily_calories" >= 500) AND ("daily_calories" <= 10000)))),
    CONSTRAINT "nutrition_plans_description_check" CHECK ((("description" IS NULL) OR (("char_length"("btrim"("description")) >= 1) AND ("char_length"("btrim"("description")) <= 5000)))),
    CONSTRAINT "nutrition_plans_dietary_preference_check" CHECK ((("dietary_preference" IS NULL) OR (("char_length"("btrim"("dietary_preference")) >= 1) AND ("char_length"("btrim"("dietary_preference")) <= 120)))),
    CONSTRAINT "nutrition_plans_duration_weeks_check" CHECK ((("duration_weeks" >= 1) AND ("duration_weeks" <= 104))),
    CONSTRAINT "nutrition_plans_fat_grams_check" CHECK ((("fat_grams" IS NULL) OR (("fat_grams" >= 0) AND ("fat_grams" <= 500)))),
    CONSTRAINT "nutrition_plans_fiber_grams_check" CHECK ((("fiber_grams" IS NULL) OR (("fiber_grams" >= 0) AND ("fiber_grams" <= 200)))),
    CONSTRAINT "nutrition_plans_foods_to_avoid_check" CHECK ((("foods_to_avoid" IS NULL) OR (("char_length"("btrim"("foods_to_avoid")) >= 1) AND ("char_length"("btrim"("foods_to_avoid")) <= 1000)))),
    CONSTRAINT "nutrition_plans_name_check" CHECK ((("char_length"("btrim"("name")) >= 1) AND ("char_length"("btrim"("name")) <= 120))),
    CONSTRAINT "nutrition_plans_protein_grams_check" CHECK ((("protein_grams" IS NULL) OR (("protein_grams" >= 0) AND ("protein_grams" <= 1000)))),
    CONSTRAINT "nutrition_plans_water_liters_check" CHECK ((("water_liters" IS NULL) OR (("water_liters" >= (0)::numeric) AND ("water_liters" <= (20)::numeric))))
);


ALTER TABLE "public"."nutrition_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_full_name_length" CHECK ((("char_length"("btrim"("full_name")) >= 1) AND ("char_length"("btrim"("full_name")) <= 120)))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."super_admins" (
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."super_admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_days" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workout_plan_id" "uuid" NOT NULL,
    "position" smallint NOT NULL,
    "name" "text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "workout_days_name_length" CHECK ((("char_length"("btrim"("name")) >= 1) AND ("char_length"("btrim"("name")) <= 120))),
    CONSTRAINT "workout_days_notes_length" CHECK ((("notes" IS NULL) OR (("char_length"("btrim"("notes")) >= 1) AND ("char_length"("btrim"("notes")) <= 3000)))),
    CONSTRAINT "workout_days_position_range" CHECK ((("position" >= 1) AND ("position" <= 31)))
);


ALTER TABLE "public"."workout_days" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_exercises" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workout_day_id" "uuid" NOT NULL,
    "position" smallint NOT NULL,
    "name" "text" NOT NULL,
    "sets" smallint NOT NULL,
    "reps" "text" NOT NULL,
    "rest_seconds" integer,
    "tempo" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "target_load" "text",
    "demo_url" "text",
    CONSTRAINT "workout_exercises_demo_url_length" CHECK ((("demo_url" IS NULL) OR (("char_length"("btrim"("demo_url")) >= 8) AND ("char_length"("btrim"("demo_url")) <= 2048)))),
    CONSTRAINT "workout_exercises_name_length" CHECK ((("char_length"("btrim"("name")) >= 1) AND ("char_length"("btrim"("name")) <= 160))),
    CONSTRAINT "workout_exercises_notes_length" CHECK ((("notes" IS NULL) OR (("char_length"("btrim"("notes")) >= 1) AND ("char_length"("btrim"("notes")) <= 3000)))),
    CONSTRAINT "workout_exercises_position_range" CHECK ((("position" >= 1) AND ("position" <= 100))),
    CONSTRAINT "workout_exercises_reps_length" CHECK ((("char_length"("btrim"("reps")) >= 1) AND ("char_length"("btrim"("reps")) <= 50))),
    CONSTRAINT "workout_exercises_rest_range" CHECK ((("rest_seconds" IS NULL) OR (("rest_seconds" >= 0) AND ("rest_seconds" <= 3600)))),
    CONSTRAINT "workout_exercises_sets_range" CHECK ((("sets" >= 1) AND ("sets" <= 20))),
    CONSTRAINT "workout_exercises_target_load_length" CHECK ((("target_load" IS NULL) OR (("char_length"("btrim"("target_load")) >= 1) AND ("char_length"("btrim"("target_load")) <= 80)))),
    CONSTRAINT "workout_exercises_tempo_length" CHECK ((("tempo" IS NULL) OR (("char_length"("btrim"("tempo")) >= 1) AND ("char_length"("btrim"("tempo")) <= 50))))
);


ALTER TABLE "public"."workout_exercises" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_plan_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "workout_plan_id" "uuid" NOT NULL,
    "assigned_by" "uuid" NOT NULL,
    "status" "public"."workout_assignment_status" DEFAULT 'active'::"public"."workout_assignment_status" NOT NULL,
    "starts_on" "date" DEFAULT CURRENT_DATE NOT NULL,
    "ends_on" "date" DEFAULT (CURRENT_DATE + 83) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "workout_assignments_date_range" CHECK ((("ends_on" IS NULL) OR ("ends_on" >= "starts_on")))
);


ALTER TABLE "public"."workout_plan_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "status" "public"."workout_plan_status" DEFAULT 'draft'::"public"."workout_plan_status" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "duration_weeks" smallint DEFAULT 12 NOT NULL,
    CONSTRAINT "workout_plans_description_length" CHECK ((("description" IS NULL) OR (("char_length"("btrim"("description")) >= 1) AND ("char_length"("btrim"("description")) <= 5000)))),
    CONSTRAINT "workout_plans_duration_weeks_check" CHECK ((("duration_weeks" >= 1) AND ("duration_weeks" <= 104))),
    CONSTRAINT "workout_plans_name_length" CHECK ((("char_length"("btrim"("name")) >= 1) AND ("char_length"("btrim"("name")) <= 120)))
);


ALTER TABLE "public"."workout_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspace_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "token_hash" "text" NOT NULL,
    "status" "public"."invitation_status" DEFAULT 'pending'::"public"."invitation_status" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "accepted_by" "uuid",
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "workspace_invitations_acceptance_state" CHECK (((("status" = 'accepted'::"public"."invitation_status") AND ("accepted_at" IS NOT NULL)) OR (("status" <> 'accepted'::"public"."invitation_status") AND ("accepted_at" IS NULL) AND ("accepted_by" IS NULL)))),
    CONSTRAINT "workspace_invitations_expiration" CHECK (("expires_at" > "created_at")),
    CONSTRAINT "workspace_invitations_token_hash_format" CHECK (("token_hash" ~ '^[0-9a-f]{64}$'::"text"))
);


ALTER TABLE "public"."workspace_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspace_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."workspace_role" NOT NULL,
    "status" "public"."membership_status" DEFAULT 'active'::"public"."membership_status" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."workspace_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_demo" boolean DEFAULT false NOT NULL,
    "demo_expires_at" timestamp with time zone,
    "approval_status" "public"."workspace_approval_status" DEFAULT 'pending_review'::"public"."workspace_approval_status" NOT NULL,
    "approval_reviewed_at" timestamp with time zone,
    "approval_reviewed_by" "uuid",
    "approval_note" "text",
    CONSTRAINT "workspaces_approval_note_length" CHECK ((("approval_note" IS NULL) OR ("char_length"("approval_note") <= 1000))),
    CONSTRAINT "workspaces_demo_expiry_state" CHECK ((("is_demo" AND ("demo_expires_at" IS NOT NULL)) OR ((NOT "is_demo") AND ("demo_expires_at" IS NULL)))),
    CONSTRAINT "workspaces_name_length" CHECK ((("char_length"("btrim"("name")) >= 1) AND ("char_length"("btrim"("name")) <= 120)))
);


ALTER TABLE "public"."workspaces" OWNER TO "postgres";


ALTER TABLE ONLY "public"."check_ins"
    ADD CONSTRAINT "check_ins_one_per_client_week" UNIQUE ("workspace_id", "client_id", "week_start");



ALTER TABLE ONLY "public"."check_ins"
    ADD CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_intake_forms"
    ADD CONSTRAINT "client_intake_forms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_intake_forms"
    ADD CONSTRAINT "client_intake_forms_workspace_id_client_id_key" UNIQUE ("workspace_id", "client_id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_workspace_id_id_unique" UNIQUE ("workspace_id", "id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_workspace_user_unique" UNIQUE ("workspace_id", "user_id");



ALTER TABLE ONLY "public"."nutrition_items"
    ADD CONSTRAINT "nutrition_items_nutrition_meal_id_position_key" UNIQUE ("nutrition_meal_id", "position");



ALTER TABLE ONLY "public"."nutrition_items"
    ADD CONSTRAINT "nutrition_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nutrition_meals"
    ADD CONSTRAINT "nutrition_meals_nutrition_plan_id_position_key" UNIQUE ("nutrition_plan_id", "position");



ALTER TABLE ONLY "public"."nutrition_meals"
    ADD CONSTRAINT "nutrition_meals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nutrition_plan_assignments"
    ADD CONSTRAINT "nutrition_plan_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nutrition_plans"
    ADD CONSTRAINT "nutrition_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nutrition_plans"
    ADD CONSTRAINT "nutrition_plans_workspace_id_id_key" UNIQUE ("workspace_id", "id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."super_admins"
    ADD CONSTRAINT "super_admins_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."workout_days"
    ADD CONSTRAINT "workout_days_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_days"
    ADD CONSTRAINT "workout_days_plan_position_unique" UNIQUE ("workout_plan_id", "position");



ALTER TABLE ONLY "public"."workout_exercises"
    ADD CONSTRAINT "workout_exercises_day_position_unique" UNIQUE ("workout_day_id", "position");



ALTER TABLE ONLY "public"."workout_exercises"
    ADD CONSTRAINT "workout_exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_plan_assignments"
    ADD CONSTRAINT "workout_plan_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_plans"
    ADD CONSTRAINT "workout_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_plans"
    ADD CONSTRAINT "workout_plans_workspace_id_id_unique" UNIQUE ("workspace_id", "id");



ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_token_hash_key" UNIQUE ("token_hash");



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_workspace_user_unique" UNIQUE ("workspace_id", "user_id");



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id");



CREATE INDEX "check_ins_client_week_idx" ON "public"."check_ins" USING "btree" ("client_id", "week_start" DESC);



CREATE INDEX "check_ins_workspace_week_idx" ON "public"."check_ins" USING "btree" ("workspace_id", "week_start" DESC);



CREATE INDEX "client_intake_forms_workspace_client_idx" ON "public"."client_intake_forms" USING "btree" ("workspace_id", "client_id");



CREATE INDEX "clients_user_id_idx" ON "public"."clients" USING "btree" ("user_id");



CREATE INDEX "workspace_members_user_id_idx" ON "public"."workspace_members" USING "btree" ("user_id");



CREATE INDEX "workspaces_owner_id_idx" ON "public"."workspaces" USING "btree" ("owner_id");



CREATE INDEX "clients_workspace_id_idx" ON "public"."clients" USING "btree" ("workspace_id");



CREATE INDEX "clients_workspace_name_idx" ON "public"."clients" USING "btree" ("workspace_id", "last_name", "first_name");



CREATE INDEX "clients_workspace_status_idx" ON "public"."clients" USING "btree" ("workspace_id", "status");



CREATE INDEX "nutrition_assignments_client_idx" ON "public"."nutrition_plan_assignments" USING "btree" ("client_id", "status", "starts_on" DESC);



CREATE UNIQUE INDEX "nutrition_assignments_one_active_idx" ON "public"."nutrition_plan_assignments" USING "btree" ("client_id", "nutrition_plan_id") WHERE ("status" = 'active'::"public"."nutrition_assignment_status");



CREATE INDEX "nutrition_plans_workspace_status_idx" ON "public"."nutrition_plans" USING "btree" ("workspace_id", "status", "updated_at" DESC);



CREATE INDEX "workout_assignments_client_status_idx" ON "public"."workout_plan_assignments" USING "btree" ("client_id", "status", "starts_on" DESC);



CREATE UNIQUE INDEX "workout_assignments_one_active_plan_idx" ON "public"."workout_plan_assignments" USING "btree" ("client_id", "workout_plan_id") WHERE ("status" = 'active'::"public"."workout_assignment_status");



CREATE INDEX "workout_assignments_plan_idx" ON "public"."workout_plan_assignments" USING "btree" ("workout_plan_id");



CREATE INDEX "workout_days_plan_position_idx" ON "public"."workout_days" USING "btree" ("workout_plan_id", "position");



CREATE INDEX "workout_exercises_day_position_idx" ON "public"."workout_exercises" USING "btree" ("workout_day_id", "position");



CREATE INDEX "workout_plans_workspace_status_idx" ON "public"."workout_plans" USING "btree" ("workspace_id", "status", "updated_at" DESC);



CREATE INDEX "workspace_invitations_client_id_idx" ON "public"."workspace_invitations" USING "btree" ("client_id");



CREATE UNIQUE INDEX "workspace_invitations_one_pending_per_client_idx" ON "public"."workspace_invitations" USING "btree" ("client_id") WHERE ("status" = 'pending'::"public"."invitation_status");



CREATE INDEX "workspace_invitations_status_expires_idx" ON "public"."workspace_invitations" USING "btree" ("status", "expires_at");



CREATE INDEX "workspace_invitations_workspace_id_idx" ON "public"."workspace_invitations" USING "btree" ("workspace_id");



CREATE INDEX "workspace_members_workspace_id_idx" ON "public"."workspace_members" USING "btree" ("workspace_id");



CREATE INDEX "workspaces_approval_status_created_idx" ON "public"."workspaces" USING "btree" ("approval_status", "created_at" DESC);



CREATE INDEX "workspaces_demo_expiry_idx" ON "public"."workspaces" USING "btree" ("demo_expires_at") WHERE "is_demo";



CREATE OR REPLACE TRIGGER "check_ins_set_updated_at" BEFORE UPDATE ON "public"."check_ins" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "client_intake_forms_set_updated_at" BEFORE UPDATE ON "public"."client_intake_forms" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "clients_set_demo_gender" BEFORE INSERT ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "private"."set_demo_client_gender"();



CREATE OR REPLACE TRIGGER "clients_set_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "nutrition_assignments_set_updated_at" BEFORE UPDATE ON "public"."nutrition_plan_assignments" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "nutrition_items_set_updated_at" BEFORE UPDATE ON "public"."nutrition_items" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "nutrition_meals_set_updated_at" BEFORE UPDATE ON "public"."nutrition_meals" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "nutrition_plans_set_updated_at" BEFORE UPDATE ON "public"."nutrition_plans" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "profiles_set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "workout_assignments_set_updated_at" BEFORE UPDATE ON "public"."workout_plan_assignments" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "workout_days_set_updated_at" BEFORE UPDATE ON "public"."workout_days" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "workout_exercises_set_updated_at" BEFORE UPDATE ON "public"."workout_exercises" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "workout_plans_set_updated_at" BEFORE UPDATE ON "public"."workout_plans" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "workspace_invitations_block_demo" BEFORE INSERT ON "public"."workspace_invitations" FOR EACH ROW EXECUTE FUNCTION "private"."block_demo_invitations"();



CREATE OR REPLACE TRIGGER "workspace_invitations_set_updated_at" BEFORE UPDATE ON "public"."workspace_invitations" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "workspace_members_set_updated_at" BEFORE UPDATE ON "public"."workspace_members" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "workspaces_approve_demo_on_insert" BEFORE INSERT ON "public"."workspaces" FOR EACH ROW EXECUTE FUNCTION "private"."approve_demo_workspace_on_insert"();



CREATE OR REPLACE TRIGGER "workspaces_enforce_anonymous_type" BEFORE INSERT ON "public"."workspaces" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_anonymous_workspace_type"();



CREATE OR REPLACE TRIGGER "workspaces_prevent_approval_self_update" BEFORE UPDATE ON "public"."workspaces" FOR EACH ROW EXECUTE FUNCTION "private"."prevent_workspace_approval_self_update"();



CREATE OR REPLACE TRIGGER "workspaces_set_updated_at" BEFORE UPDATE ON "public"."workspaces" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



ALTER TABLE ONLY "public"."check_ins"
    ADD CONSTRAINT "check_ins_client_workspace_fk" FOREIGN KEY ("workspace_id", "client_id") REFERENCES "public"."clients"("workspace_id", "id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."check_ins"
    ADD CONSTRAINT "check_ins_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."check_ins"
    ADD CONSTRAINT "check_ins_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_intake_forms"
    ADD CONSTRAINT "client_intake_forms_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."client_intake_forms"
    ADD CONSTRAINT "client_intake_forms_workspace_id_client_id_fkey" FOREIGN KEY ("workspace_id", "client_id") REFERENCES "public"."clients"("workspace_id", "id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_intake_forms"
    ADD CONSTRAINT "client_intake_forms_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nutrition_items"
    ADD CONSTRAINT "nutrition_items_nutrition_meal_id_fkey" FOREIGN KEY ("nutrition_meal_id") REFERENCES "public"."nutrition_meals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nutrition_meals"
    ADD CONSTRAINT "nutrition_meals_nutrition_plan_id_fkey" FOREIGN KEY ("nutrition_plan_id") REFERENCES "public"."nutrition_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nutrition_plan_assignments"
    ADD CONSTRAINT "nutrition_plan_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."nutrition_plan_assignments"
    ADD CONSTRAINT "nutrition_plan_assignments_workspace_id_client_id_fkey" FOREIGN KEY ("workspace_id", "client_id") REFERENCES "public"."clients"("workspace_id", "id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nutrition_plan_assignments"
    ADD CONSTRAINT "nutrition_plan_assignments_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nutrition_plan_assignments"
    ADD CONSTRAINT "nutrition_plan_assignments_workspace_id_nutrition_plan_id_fkey" FOREIGN KEY ("workspace_id", "nutrition_plan_id") REFERENCES "public"."nutrition_plans"("workspace_id", "id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nutrition_plans"
    ADD CONSTRAINT "nutrition_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."nutrition_plans"
    ADD CONSTRAINT "nutrition_plans_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."super_admins"
    ADD CONSTRAINT "super_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_plan_assignments"
    ADD CONSTRAINT "workout_assignments_client_workspace_fk" FOREIGN KEY ("workspace_id", "client_id") REFERENCES "public"."clients"("workspace_id", "id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_plan_assignments"
    ADD CONSTRAINT "workout_assignments_plan_workspace_fk" FOREIGN KEY ("workspace_id", "workout_plan_id") REFERENCES "public"."workout_plans"("workspace_id", "id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_plan_assignments"
    ADD CONSTRAINT "workout_assignments_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_days"
    ADD CONSTRAINT "workout_days_workout_plan_id_fkey" FOREIGN KEY ("workout_plan_id") REFERENCES "public"."workout_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_exercises"
    ADD CONSTRAINT "workout_exercises_workout_day_id_fkey" FOREIGN KEY ("workout_day_id") REFERENCES "public"."workout_days"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_plan_assignments"
    ADD CONSTRAINT "workout_plan_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."workout_plans"
    ADD CONSTRAINT "workout_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."workout_plans"
    ADD CONSTRAINT "workout_plans_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_client_workspace_fk" FOREIGN KEY ("workspace_id", "client_id") REFERENCES "public"."clients"("workspace_id", "id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_approval_reviewed_by_fkey" FOREIGN KEY ("approval_reviewed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE "public"."check_ins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "check_ins_insert_own" ON "public"."check_ins" FOR INSERT TO "authenticated" WITH CHECK ((("submitted_by" = ( SELECT "auth"."uid"() AS "uid")) AND ("coach_feedback" IS NULL) AND ("reviewed_at" IS NULL) AND "private"."is_active_workspace_member"("workspace_id") AND (EXISTS ( SELECT 1
   FROM "public"."clients" "client"
  WHERE (("client"."id" = "check_ins"."client_id") AND ("client"."workspace_id" = "check_ins"."workspace_id") AND ("client"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "check_ins_select_accessible" ON "public"."check_ins" FOR SELECT TO "authenticated" USING (("private"."is_workspace_owner"("workspace_id") OR (("submitted_by" = ( SELECT "auth"."uid"() AS "uid")) AND "private"."is_active_workspace_member"("workspace_id"))));



CREATE POLICY "check_ins_update_owned" ON "public"."check_ins" FOR UPDATE TO "authenticated" USING ("private"."is_workspace_owner"("workspace_id")) WITH CHECK ("private"."is_workspace_owner"("workspace_id"));



ALTER TABLE "public"."client_intake_forms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_intake_forms_insert_own" ON "public"."client_intake_forms" FOR INSERT TO "authenticated" WITH CHECK ((("submitted_by" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."clients" "client"
  WHERE (("client"."id" = "client_intake_forms"."client_id") AND ("client"."workspace_id" = "client_intake_forms"."workspace_id") AND ("client"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("client"."status" = 'active'::"public"."client_status") AND "private"."is_active_workspace_member"("client"."workspace_id"))))));



CREATE POLICY "client_intake_forms_select_accessible" ON "public"."client_intake_forms" FOR SELECT TO "authenticated" USING (("private"."is_workspace_owner"("workspace_id") OR (EXISTS ( SELECT 1
   FROM "public"."clients" "client"
  WHERE (("client"."id" = "client_intake_forms"."client_id") AND ("client"."workspace_id" = "client_intake_forms"."workspace_id") AND ("client"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "private"."is_active_workspace_member"("client"."workspace_id"))))));



CREATE POLICY "client_intake_forms_update_own" ON "public"."client_intake_forms" FOR UPDATE TO "authenticated" USING ((("submitted_by" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."clients" "client"
  WHERE (("client"."id" = "client_intake_forms"."client_id") AND ("client"."workspace_id" = "client_intake_forms"."workspace_id") AND ("client"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("client"."status" = 'active'::"public"."client_status") AND "private"."is_active_workspace_member"("client"."workspace_id")))))) WITH CHECK ((("submitted_by" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."clients" "client"
  WHERE (("client"."id" = "client_intake_forms"."client_id") AND ("client"."workspace_id" = "client_intake_forms"."workspace_id") AND ("client"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("client"."status" = 'active'::"public"."client_status") AND "private"."is_active_workspace_member"("client"."workspace_id"))))));



ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clients_insert_owned" ON "public"."clients" FOR INSERT TO "authenticated" WITH CHECK ("private"."is_workspace_owner"("workspace_id"));



CREATE POLICY "clients_select_accessible" ON "public"."clients" FOR SELECT TO "authenticated" USING (("private"."is_workspace_owner"("workspace_id") OR (("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "private"."is_active_workspace_member"("workspace_id"))));



CREATE POLICY "clients_update_owned" ON "public"."clients" FOR UPDATE TO "authenticated" USING ("private"."is_workspace_owner"("workspace_id")) WITH CHECK ("private"."is_workspace_owner"("workspace_id"));



CREATE POLICY "nutrition_assignments_insert" ON "public"."nutrition_plan_assignments" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_workspace_owner"("workspace_id") AND ("assigned_by" = ( SELECT "auth"."uid"() AS "uid")) AND "private"."is_nutrition_plan_owner"("nutrition_plan_id") AND (EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "nutrition_plan_assignments"."client_id") AND ("c"."workspace_id" = "c"."workspace_id") AND ("c"."status" <> 'archived'::"public"."client_status"))))));



CREATE POLICY "nutrition_assignments_select" ON "public"."nutrition_plan_assignments" FOR SELECT TO "authenticated" USING (("private"."is_workspace_owner"("workspace_id") OR ("private"."is_active_workspace_member"("workspace_id") AND (EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "nutrition_plan_assignments"."client_id") AND ("c"."workspace_id" = "c"."workspace_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "nutrition_assignments_update" ON "public"."nutrition_plan_assignments" FOR UPDATE TO "authenticated" USING ("private"."is_workspace_owner"("workspace_id")) WITH CHECK ("private"."is_workspace_owner"("workspace_id"));



ALTER TABLE "public"."nutrition_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nutrition_items_delete" ON "public"."nutrition_items" FOR DELETE TO "authenticated" USING ("private"."is_nutrition_meal_owner"("nutrition_meal_id"));



CREATE POLICY "nutrition_items_insert" ON "public"."nutrition_items" FOR INSERT TO "authenticated" WITH CHECK ("private"."is_nutrition_meal_owner"("nutrition_meal_id"));



CREATE POLICY "nutrition_items_select" ON "public"."nutrition_items" FOR SELECT TO "authenticated" USING ("private"."can_access_nutrition_meal"("nutrition_meal_id"));



CREATE POLICY "nutrition_items_update" ON "public"."nutrition_items" FOR UPDATE TO "authenticated" USING ("private"."is_nutrition_meal_owner"("nutrition_meal_id")) WITH CHECK ("private"."is_nutrition_meal_owner"("nutrition_meal_id"));



ALTER TABLE "public"."nutrition_meals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nutrition_meals_delete" ON "public"."nutrition_meals" FOR DELETE TO "authenticated" USING ("private"."is_nutrition_plan_owner"("nutrition_plan_id"));



CREATE POLICY "nutrition_meals_insert" ON "public"."nutrition_meals" FOR INSERT TO "authenticated" WITH CHECK ("private"."is_nutrition_plan_owner"("nutrition_plan_id"));



CREATE POLICY "nutrition_meals_select" ON "public"."nutrition_meals" FOR SELECT TO "authenticated" USING ("private"."can_access_nutrition_plan"("nutrition_plan_id"));



CREATE POLICY "nutrition_meals_update" ON "public"."nutrition_meals" FOR UPDATE TO "authenticated" USING ("private"."is_nutrition_plan_owner"("nutrition_plan_id")) WITH CHECK ("private"."is_nutrition_plan_owner"("nutrition_plan_id"));



ALTER TABLE "public"."nutrition_plan_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nutrition_plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nutrition_plans_insert" ON "public"."nutrition_plans" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_workspace_owner"("workspace_id") AND ("created_by" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "nutrition_plans_select" ON "public"."nutrition_plans" FOR SELECT TO "authenticated" USING ("private"."can_access_nutrition_plan"("id"));



CREATE POLICY "nutrition_plans_update" ON "public"."nutrition_plans" FOR UPDATE TO "authenticated" USING ("private"."is_workspace_owner"("workspace_id")) WITH CHECK ("private"."is_workspace_owner"("workspace_id"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."super_admins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "super_admins_select_own_or_admin" ON "public"."super_admins" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "private"."is_super_admin"()));



CREATE POLICY "workout_assignments_insert_owned" ON "public"."workout_plan_assignments" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_workspace_owner"("workspace_id") AND ("assigned_by" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."workout_plans" "plan"
  WHERE (("plan"."id" = "workout_plan_assignments"."workout_plan_id") AND ("plan"."workspace_id" = "workout_plan_assignments"."workspace_id") AND ("plan"."status" = 'active'::"public"."workout_plan_status")))) AND (EXISTS ( SELECT 1
   FROM "public"."clients" "client"
  WHERE (("client"."id" = "workout_plan_assignments"."client_id") AND ("client"."workspace_id" = "workout_plan_assignments"."workspace_id") AND ("client"."status" <> 'archived'::"public"."client_status"))))));



CREATE POLICY "workout_assignments_select_accessible" ON "public"."workout_plan_assignments" FOR SELECT TO "authenticated" USING (("private"."is_workspace_owner"("workspace_id") OR ("private"."is_active_workspace_member"("workspace_id") AND (EXISTS ( SELECT 1
   FROM "public"."clients" "client"
  WHERE (("client"."id" = "workout_plan_assignments"."client_id") AND ("client"."workspace_id" = "workout_plan_assignments"."workspace_id") AND ("client"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "workout_assignments_update_owned" ON "public"."workout_plan_assignments" FOR UPDATE TO "authenticated" USING ("private"."is_workspace_owner"("workspace_id")) WITH CHECK ("private"."is_workspace_owner"("workspace_id"));



ALTER TABLE "public"."workout_days" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workout_days_delete_owned" ON "public"."workout_days" FOR DELETE TO "authenticated" USING ("private"."is_workout_plan_owner"("workout_plan_id"));



CREATE POLICY "workout_days_insert_owned" ON "public"."workout_days" FOR INSERT TO "authenticated" WITH CHECK ("private"."is_workout_plan_owner"("workout_plan_id"));



CREATE POLICY "workout_days_select_accessible" ON "public"."workout_days" FOR SELECT TO "authenticated" USING ("private"."can_access_workout_plan"("workout_plan_id"));



CREATE POLICY "workout_days_update_owned" ON "public"."workout_days" FOR UPDATE TO "authenticated" USING ("private"."is_workout_plan_owner"("workout_plan_id")) WITH CHECK ("private"."is_workout_plan_owner"("workout_plan_id"));



ALTER TABLE "public"."workout_exercises" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workout_exercises_delete_owned" ON "public"."workout_exercises" FOR DELETE TO "authenticated" USING ("private"."is_workout_day_owner"("workout_day_id"));



CREATE POLICY "workout_exercises_insert_owned" ON "public"."workout_exercises" FOR INSERT TO "authenticated" WITH CHECK ("private"."is_workout_day_owner"("workout_day_id"));



CREATE POLICY "workout_exercises_select_accessible" ON "public"."workout_exercises" FOR SELECT TO "authenticated" USING ("private"."can_access_workout_day"("workout_day_id"));



CREATE POLICY "workout_exercises_update_owned" ON "public"."workout_exercises" FOR UPDATE TO "authenticated" USING ("private"."is_workout_day_owner"("workout_day_id")) WITH CHECK ("private"."is_workout_day_owner"("workout_day_id"));



ALTER TABLE "public"."workout_plan_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workout_plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workout_plans_insert_owned" ON "public"."workout_plans" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_workspace_owner"("workspace_id") AND ("created_by" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "workout_plans_select_accessible" ON "public"."workout_plans" FOR SELECT TO "authenticated" USING ("private"."can_access_workout_plan"("id"));



CREATE POLICY "workout_plans_update_owned" ON "public"."workout_plans" FOR UPDATE TO "authenticated" USING ("private"."is_workspace_owner"("workspace_id")) WITH CHECK ("private"."is_workspace_owner"("workspace_id"));



ALTER TABLE "public"."workspace_invitations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workspace_invitations_insert_owned" ON "public"."workspace_invitations" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_workspace_owner"("workspace_id") AND ("created_by" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "workspace_invitations_select_owned" ON "public"."workspace_invitations" FOR SELECT TO "authenticated" USING ("private"."is_workspace_owner"("workspace_id"));



CREATE POLICY "workspace_invitations_update_owned" ON "public"."workspace_invitations" FOR UPDATE TO "authenticated" USING ("private"."is_workspace_owner"("workspace_id")) WITH CHECK (("private"."is_workspace_owner"("workspace_id") AND ("created_by" = ( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."workspace_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workspace_members_select_accessible" ON "public"."workspace_members" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "private"."is_workspace_owner"("workspace_id")));



CREATE POLICY "workspace_members_update_owned" ON "public"."workspace_members" FOR UPDATE TO "authenticated" USING ("private"."is_workspace_owner"("workspace_id")) WITH CHECK ("private"."is_workspace_owner"("workspace_id"));



ALTER TABLE "public"."workspaces" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workspaces_select_accessible" ON "public"."workspaces" FOR SELECT TO "authenticated" USING ((("owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR "private"."is_active_workspace_member"("id") OR "private"."is_super_admin"()));



CREATE POLICY "workspaces_update_owned" ON "public"."workspaces" FOR UPDATE TO "authenticated" USING (("owner_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("owner_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "workspaces_update_super_admin_review" ON "public"."workspaces" FOR UPDATE TO "authenticated" USING ("private"."is_super_admin"()) WITH CHECK ("private"."is_super_admin"());





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";








GRANT USAGE ON SCHEMA "private" TO "authenticated";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON TYPE "public"."client_status" TO "authenticated";



GRANT ALL ON TYPE "public"."invitation_status" TO "authenticated";



GRANT ALL ON TYPE "public"."membership_status" TO "authenticated";



GRANT ALL ON TYPE "public"."nutrition_assignment_status" TO "authenticated";



GRANT ALL ON TYPE "public"."nutrition_plan_status" TO "authenticated";



GRANT ALL ON TYPE "public"."workout_assignment_status" TO "authenticated";



GRANT ALL ON TYPE "public"."workout_plan_status" TO "authenticated";



GRANT ALL ON TYPE "public"."workspace_role" TO "authenticated";

















































































































































































REVOKE ALL ON FUNCTION "private"."can_access_nutrition_meal"("target_meal_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."can_access_nutrition_meal"("target_meal_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."can_access_nutrition_plan"("target_plan_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."can_access_nutrition_plan"("target_plan_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."can_access_workout_day"("target_day_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."can_access_workout_day"("target_day_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."can_access_workout_plan"("target_plan_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."can_access_workout_plan"("target_plan_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."cleanup_expired_demo_workspaces"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."is_active_workspace_member"("target_workspace_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_active_workspace_member"("target_workspace_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."is_nutrition_meal_owner"("target_meal_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_nutrition_meal_owner"("target_meal_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."is_nutrition_plan_owner"("target_plan_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_nutrition_plan_owner"("target_plan_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."is_super_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_super_admin"() TO "authenticated";



REVOKE ALL ON FUNCTION "private"."is_workout_day_owner"("target_day_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_workout_day_owner"("target_day_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."is_workout_plan_owner"("target_plan_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_workout_plan_owner"("target_plan_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."is_workspace_owner"("target_workspace_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_workspace_owner"("target_workspace_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."set_updated_at"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."accept_client_invitation"("invitation_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."accept_client_invitation"("invitation_token" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."complete_coach_onboarding"("full_name" "text", "workspace_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_coach_onboarding"("full_name" "text", "workspace_name" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."create_client_invitation"("requested_client_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_client_invitation"("requested_client_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."create_nutrition_plan"("requested_name" "text", "requested_description" "text", "requested_daily_calories" integer, "requested_protein_grams" integer, "requested_carbs_grams" integer, "requested_fat_grams" integer, "requested_duration_weeks" integer, "requested_fiber_grams" integer, "requested_water_liters" numeric, "requested_dietary_preference" "text", "requested_allergies" "text", "requested_foods_to_avoid" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_nutrition_plan"("requested_name" "text", "requested_description" "text", "requested_daily_calories" integer, "requested_protein_grams" integer, "requested_carbs_grams" integer, "requested_fat_grams" integer, "requested_duration_weeks" integer, "requested_fiber_grams" integer, "requested_water_liters" numeric, "requested_dietary_preference" "text", "requested_allergies" "text", "requested_foods_to_avoid" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."create_workout_plan"("requested_name" "text", "requested_description" "text", "requested_duration_weeks" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_workout_plan"("requested_name" "text", "requested_description" "text", "requested_duration_weeks" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."delete_client"("target_client_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_client"("target_client_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."enrich_demo_workspace_sample_data"("target_workspace_id" "uuid", "target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enrich_demo_workspace_sample_data"("target_workspace_id" "uuid", "target_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."enter_demo_client_preview"("requested_client_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enter_demo_client_preview"("requested_client_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."exit_demo_client_preview"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."exit_demo_client_preview"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."preview_client_invitation"("invitation_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."preview_client_invitation"("invitation_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."preview_client_invitation"("invitation_token" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."provision_demo_workspace"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."provision_demo_workspace"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."request_workspace_review_again"("full_name" "text", "workspace_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."request_workspace_review_again"("full_name" "text", "workspace_name" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."set_client_status"("target_client_id" "uuid", "requested_status" "public"."client_status") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_client_status"("target_client_id" "uuid", "requested_status" "public"."client_status") TO "authenticated";
























GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."check_ins" TO "service_role";
GRANT SELECT ON TABLE "public"."check_ins" TO "authenticated";



GRANT INSERT("workspace_id") ON TABLE "public"."check_ins" TO "authenticated";



GRANT INSERT("client_id") ON TABLE "public"."check_ins" TO "authenticated";



GRANT INSERT("submitted_by") ON TABLE "public"."check_ins" TO "authenticated";



GRANT INSERT("week_start") ON TABLE "public"."check_ins" TO "authenticated";



GRANT INSERT("weight_kg") ON TABLE "public"."check_ins" TO "authenticated";



GRANT INSERT("energy_score") ON TABLE "public"."check_ins" TO "authenticated";



GRANT INSERT("mood_score") ON TABLE "public"."check_ins" TO "authenticated";



GRANT INSERT("notes") ON TABLE "public"."check_ins" TO "authenticated";



GRANT UPDATE("coach_feedback") ON TABLE "public"."check_ins" TO "authenticated";



GRANT UPDATE("reviewed_at") ON TABLE "public"."check_ins" TO "authenticated";



GRANT INSERT("progress_photo_path") ON TABLE "public"."check_ins" TO "authenticated";



GRANT INSERT("waist_cm") ON TABLE "public"."check_ins" TO "authenticated";



GRANT INSERT("chest_cm") ON TABLE "public"."check_ins" TO "authenticated";



GRANT INSERT("hip_cm") ON TABLE "public"."check_ins" TO "authenticated";



GRANT INSERT("thigh_cm") ON TABLE "public"."check_ins" TO "authenticated";



GRANT INSERT("arm_cm") ON TABLE "public"."check_ins" TO "authenticated";



GRANT INSERT("front_photo_path") ON TABLE "public"."check_ins" TO "authenticated";



GRANT INSERT("side_photo_path") ON TABLE "public"."check_ins" TO "authenticated";



GRANT INSERT("back_photo_path") ON TABLE "public"."check_ins" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."client_intake_forms" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."client_intake_forms" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."clients" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."clients" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."nutrition_items" TO "service_role";
GRANT SELECT,DELETE ON TABLE "public"."nutrition_items" TO "authenticated";



GRANT INSERT("nutrition_meal_id") ON TABLE "public"."nutrition_items" TO "authenticated";



GRANT INSERT("position"),UPDATE("position") ON TABLE "public"."nutrition_items" TO "authenticated";



GRANT INSERT("name"),UPDATE("name") ON TABLE "public"."nutrition_items" TO "authenticated";



GRANT INSERT("amount"),UPDATE("amount") ON TABLE "public"."nutrition_items" TO "authenticated";



GRANT INSERT("alternatives"),UPDATE("alternatives") ON TABLE "public"."nutrition_items" TO "authenticated";



GRANT INSERT("calories"),UPDATE("calories") ON TABLE "public"."nutrition_items" TO "authenticated";



GRANT INSERT("protein_grams"),UPDATE("protein_grams") ON TABLE "public"."nutrition_items" TO "authenticated";



GRANT INSERT("carbs_grams"),UPDATE("carbs_grams") ON TABLE "public"."nutrition_items" TO "authenticated";



GRANT INSERT("fat_grams"),UPDATE("fat_grams") ON TABLE "public"."nutrition_items" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."nutrition_meals" TO "service_role";
GRANT SELECT,DELETE ON TABLE "public"."nutrition_meals" TO "authenticated";



GRANT INSERT("nutrition_plan_id") ON TABLE "public"."nutrition_meals" TO "authenticated";



GRANT INSERT("position"),UPDATE("position") ON TABLE "public"."nutrition_meals" TO "authenticated";



GRANT INSERT("name"),UPDATE("name") ON TABLE "public"."nutrition_meals" TO "authenticated";



GRANT INSERT("timing"),UPDATE("timing") ON TABLE "public"."nutrition_meals" TO "authenticated";



GRANT INSERT("notes"),UPDATE("notes") ON TABLE "public"."nutrition_meals" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."nutrition_plan_assignments" TO "service_role";
GRANT SELECT ON TABLE "public"."nutrition_plan_assignments" TO "authenticated";



GRANT INSERT("workspace_id") ON TABLE "public"."nutrition_plan_assignments" TO "authenticated";



GRANT INSERT("client_id") ON TABLE "public"."nutrition_plan_assignments" TO "authenticated";



GRANT INSERT("nutrition_plan_id") ON TABLE "public"."nutrition_plan_assignments" TO "authenticated";



GRANT INSERT("assigned_by") ON TABLE "public"."nutrition_plan_assignments" TO "authenticated";



GRANT INSERT("status"),UPDATE("status") ON TABLE "public"."nutrition_plan_assignments" TO "authenticated";



GRANT INSERT("starts_on"),UPDATE("starts_on") ON TABLE "public"."nutrition_plan_assignments" TO "authenticated";



GRANT INSERT("ends_on"),UPDATE("ends_on") ON TABLE "public"."nutrition_plan_assignments" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."nutrition_plans" TO "service_role";
GRANT SELECT ON TABLE "public"."nutrition_plans" TO "authenticated";



GRANT INSERT("workspace_id") ON TABLE "public"."nutrition_plans" TO "authenticated";



GRANT INSERT("name"),UPDATE("name") ON TABLE "public"."nutrition_plans" TO "authenticated";



GRANT INSERT("description"),UPDATE("description") ON TABLE "public"."nutrition_plans" TO "authenticated";



GRANT INSERT("daily_calories"),UPDATE("daily_calories") ON TABLE "public"."nutrition_plans" TO "authenticated";



GRANT INSERT("protein_grams"),UPDATE("protein_grams") ON TABLE "public"."nutrition_plans" TO "authenticated";



GRANT INSERT("carbs_grams"),UPDATE("carbs_grams") ON TABLE "public"."nutrition_plans" TO "authenticated";



GRANT INSERT("fat_grams"),UPDATE("fat_grams") ON TABLE "public"."nutrition_plans" TO "authenticated";



GRANT INSERT("status"),UPDATE("status") ON TABLE "public"."nutrition_plans" TO "authenticated";



GRANT INSERT("created_by") ON TABLE "public"."nutrition_plans" TO "authenticated";



GRANT UPDATE("duration_weeks") ON TABLE "public"."nutrition_plans" TO "authenticated";



GRANT INSERT("fiber_grams"),UPDATE("fiber_grams") ON TABLE "public"."nutrition_plans" TO "authenticated";



GRANT INSERT("water_liters"),UPDATE("water_liters") ON TABLE "public"."nutrition_plans" TO "authenticated";



GRANT INSERT("dietary_preference"),UPDATE("dietary_preference") ON TABLE "public"."nutrition_plans" TO "authenticated";



GRANT INSERT("allergies"),UPDATE("allergies") ON TABLE "public"."nutrition_plans" TO "authenticated";



GRANT INSERT("foods_to_avoid"),UPDATE("foods_to_avoid") ON TABLE "public"."nutrition_plans" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."profiles" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."super_admins" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."super_admins" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."super_admins" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."workout_days" TO "service_role";
GRANT SELECT,DELETE ON TABLE "public"."workout_days" TO "authenticated";



GRANT INSERT("workout_plan_id") ON TABLE "public"."workout_days" TO "authenticated";



GRANT INSERT("position"),UPDATE("position") ON TABLE "public"."workout_days" TO "authenticated";



GRANT INSERT("name"),UPDATE("name") ON TABLE "public"."workout_days" TO "authenticated";



GRANT INSERT("notes"),UPDATE("notes") ON TABLE "public"."workout_days" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."workout_exercises" TO "service_role";
GRANT SELECT,DELETE ON TABLE "public"."workout_exercises" TO "authenticated";



GRANT INSERT("workout_day_id") ON TABLE "public"."workout_exercises" TO "authenticated";



GRANT INSERT("position"),UPDATE("position") ON TABLE "public"."workout_exercises" TO "authenticated";



GRANT INSERT("name"),UPDATE("name") ON TABLE "public"."workout_exercises" TO "authenticated";



GRANT INSERT("sets"),UPDATE("sets") ON TABLE "public"."workout_exercises" TO "authenticated";



GRANT INSERT("reps"),UPDATE("reps") ON TABLE "public"."workout_exercises" TO "authenticated";



GRANT INSERT("rest_seconds"),UPDATE("rest_seconds") ON TABLE "public"."workout_exercises" TO "authenticated";



GRANT INSERT("tempo"),UPDATE("tempo") ON TABLE "public"."workout_exercises" TO "authenticated";



GRANT INSERT("notes"),UPDATE("notes") ON TABLE "public"."workout_exercises" TO "authenticated";



GRANT INSERT("target_load"),UPDATE("target_load") ON TABLE "public"."workout_exercises" TO "authenticated";



GRANT INSERT("demo_url"),UPDATE("demo_url") ON TABLE "public"."workout_exercises" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."workout_plan_assignments" TO "service_role";
GRANT SELECT ON TABLE "public"."workout_plan_assignments" TO "authenticated";



GRANT INSERT("workspace_id") ON TABLE "public"."workout_plan_assignments" TO "authenticated";



GRANT INSERT("client_id") ON TABLE "public"."workout_plan_assignments" TO "authenticated";



GRANT INSERT("workout_plan_id") ON TABLE "public"."workout_plan_assignments" TO "authenticated";



GRANT INSERT("assigned_by") ON TABLE "public"."workout_plan_assignments" TO "authenticated";



GRANT INSERT("status"),UPDATE("status") ON TABLE "public"."workout_plan_assignments" TO "authenticated";



GRANT INSERT("starts_on"),UPDATE("starts_on") ON TABLE "public"."workout_plan_assignments" TO "authenticated";



GRANT INSERT("ends_on"),UPDATE("ends_on") ON TABLE "public"."workout_plan_assignments" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."workout_plans" TO "service_role";
GRANT SELECT ON TABLE "public"."workout_plans" TO "authenticated";



GRANT INSERT("workspace_id") ON TABLE "public"."workout_plans" TO "authenticated";



GRANT INSERT("name"),UPDATE("name") ON TABLE "public"."workout_plans" TO "authenticated";



GRANT INSERT("description"),UPDATE("description") ON TABLE "public"."workout_plans" TO "authenticated";



GRANT INSERT("status"),UPDATE("status") ON TABLE "public"."workout_plans" TO "authenticated";



GRANT INSERT("created_by") ON TABLE "public"."workout_plans" TO "authenticated";



GRANT UPDATE("duration_weeks") ON TABLE "public"."workout_plans" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."workspace_invitations" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."workspace_invitations" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."workspace_members" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."workspace_members" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."workspaces" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."workspaces" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";
































--
-- Dumped schema changes for auth and storage
--

CREATE POLICY "check_in_photos_block_demo_uploads" ON "storage"."objects" AS RESTRICTIVE FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" <> 'check-in-photos'::"text") OR (NOT (EXISTS ( SELECT 1
   FROM ("public"."workspace_members" "member"
     JOIN "public"."workspaces" "workspace" ON (("workspace"."id" = "member"."workspace_id")))
  WHERE (("member"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "workspace"."is_demo"))))));



CREATE POLICY "check_in_photos_delete_own" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'check-in-photos'::"text") AND ("split_part"("name", '/'::"text", 2) = (( SELECT "auth"."uid"() AS "uid"))::"text") AND (EXISTS ( SELECT 1
   FROM "public"."workspace_members" "member"
  WHERE ((("member"."workspace_id")::"text" = "split_part"("objects"."name", '/'::"text", 1)) AND ("member"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("member"."role" = 'client'::"public"."workspace_role") AND ("member"."status" = 'active'::"public"."membership_status"))))));



CREATE POLICY "check_in_photos_insert_own" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'check-in-photos'::"text") AND ("split_part"("name", '/'::"text", 2) = (( SELECT "auth"."uid"() AS "uid"))::"text") AND (EXISTS ( SELECT 1
   FROM "public"."workspace_members" "member"
  WHERE ((("member"."workspace_id")::"text" = "split_part"("objects"."name", '/'::"text", 1)) AND ("member"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("member"."role" = 'client'::"public"."workspace_role") AND ("member"."status" = 'active'::"public"."membership_status")))) AND ((("array_length"("string_to_array"("name", '/'::"text"), 1) = 3) AND ("split_part"("name", '/'::"text", 3) = ("to_char"("date_trunc"('week'::"text", ("now"() AT TIME ZONE 'UTC'::"text")), 'YYYY-MM-DD'::"text") || '.webp'::"text"))) OR (("array_length"("string_to_array"("name", '/'::"text"), 1) = 5) AND ("split_part"("name", '/'::"text", 4) = "to_char"("date_trunc"('week'::"text", ("now"() AT TIME ZONE 'UTC'::"text")), 'YYYY-MM-DD'::"text")) AND ("split_part"("name", '/'::"text", 5) = ANY (ARRAY['front.webp'::"text", 'side.webp'::"text", 'back.webp'::"text"])) AND (EXISTS ( SELECT 1
   FROM "public"."clients" "client"
  WHERE ((("client"."id")::"text" = "split_part"("objects"."name", '/'::"text", 3)) AND (("client"."workspace_id")::"text" = "split_part"("objects"."name", '/'::"text", 1)) AND ("client"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("client"."status" = 'active'::"public"."client_status"))))))));



CREATE POLICY "check_in_photos_select_accessible" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'check-in-photos'::"text") AND ((EXISTS ( SELECT 1
   FROM "public"."workspaces" "workspace"
  WHERE ((("workspace"."id")::"text" = "split_part"("objects"."name", '/'::"text", 1)) AND ("workspace"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (("split_part"("name", '/'::"text", 2) = (( SELECT "auth"."uid"() AS "uid"))::"text") AND (EXISTS ( SELECT 1
   FROM "public"."workspace_members" "member"
  WHERE ((("member"."workspace_id")::"text" = "split_part"("objects"."name", '/'::"text", 1)) AND ("member"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("member"."role" = 'client'::"public"."workspace_role") AND ("member"."status" = 'active'::"public"."membership_status"))))))));



CREATE POLICY "check_in_photos_update_own" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'check-in-photos'::"text") AND ("split_part"("name", '/'::"text", 2) = (( SELECT "auth"."uid"() AS "uid"))::"text"))) WITH CHECK ((("bucket_id" = 'check-in-photos'::"text") AND ("split_part"("name", '/'::"text", 2) = (( SELECT "auth"."uid"() AS "uid"))::"text") AND (EXISTS ( SELECT 1
   FROM "public"."workspace_members" "member"
  WHERE ((("member"."workspace_id")::"text" = "split_part"("objects"."name", '/'::"text", 1)) AND ("member"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("member"."role" = 'client'::"public"."workspace_role") AND ("member"."status" = 'active'::"public"."membership_status")))) AND ((("array_length"("string_to_array"("name", '/'::"text"), 1) = 3) AND ("split_part"("name", '/'::"text", 3) = ("to_char"("date_trunc"('week'::"text", ("now"() AT TIME ZONE 'UTC'::"text")), 'YYYY-MM-DD'::"text") || '.webp'::"text"))) OR (("array_length"("string_to_array"("name", '/'::"text"), 1) = 5) AND ("split_part"("name", '/'::"text", 4) = "to_char"("date_trunc"('week'::"text", ("now"() AT TIME ZONE 'UTC'::"text")), 'YYYY-MM-DD'::"text")) AND ("split_part"("name", '/'::"text", 5) = ANY (ARRAY['front.webp'::"text", 'side.webp'::"text", 'back.webp'::"text"])) AND (EXISTS ( SELECT 1
   FROM "public"."clients" "client"
  WHERE ((("client"."id")::"text" = "split_part"("objects"."name", '/'::"text", 3)) AND (("client"."workspace_id")::"text" = "split_part"("objects"."name", '/'::"text", 1)) AND ("client"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("client"."status" = 'active'::"public"."client_status"))))))));



CREATE POLICY "client_onboarding_documents_delete_own" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'client-onboarding-documents'::"text") AND ("split_part"("name", '/'::"text", 2) = (( SELECT "auth"."uid"() AS "uid"))::"text")));



CREATE POLICY "client_onboarding_documents_insert_own" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'client-onboarding-documents'::"text") AND ("split_part"("name", '/'::"text", 2) = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("split_part"("name", '/'::"text", 4) = 'medical-report.pdf'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."clients" "client"
  WHERE ((("client"."workspace_id")::"text" = "split_part"("objects"."name", '/'::"text", 1)) AND ("client"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("client"."id")::"text" = "split_part"("objects"."name", '/'::"text", 3)) AND ("client"."status" = 'active'::"public"."client_status"))))));

CREATE POLICY "client_onboarding_documents_select_accessible" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'client-onboarding-documents'::"text") AND ((EXISTS ( SELECT 1
   FROM "public"."workspaces" "workspace"
  WHERE ((("workspace"."id")::"text" = "split_part"("workspace"."name", '/'::"text", 1)) AND ("workspace"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (("split_part"("name", '/'::"text", 2) = (( SELECT "auth"."uid"() AS "uid"))::"text") AND (EXISTS ( SELECT 1
   FROM "public"."workspace_members" "member"
  WHERE ((("member"."workspace_id")::"text" = "split_part"("objects"."name", '/'::"text", 1)) AND ("member"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("member"."role" = 'client'::"public"."workspace_role") AND ("member"."status" = 'active'::"public"."membership_status"))))))));



CREATE POLICY "client_onboarding_documents_update_own" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'client-onboarding-documents'::"text") AND ("split_part"("name", '/'::"text", 2) = (( SELECT "auth"."uid"() AS "uid"))::"text"))) WITH CHECK ((("bucket_id" = 'client-onboarding-documents'::"text") AND ("split_part"("name", '/'::"text", 2) = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("split_part"("name", '/'::"text", 4) = 'medical-report.pdf'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."clients" "client"
  WHERE ((("client"."workspace_id")::"text" = "split_part"("objects"."name", '/'::"text", 1)) AND ("client"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("client"."id")::"text" = "split_part"("objects"."name", '/'::"text", 3)) AND ("client"."status" = 'active'::"public"."client_status"))))));



CREATE POLICY "client_onboarding_photos_delete_own" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'client-onboarding-photos'::"text") AND ("split_part"("name", '/'::"text", 2) = (( SELECT "auth"."uid"() AS "uid"))::"text")));



CREATE POLICY "client_onboarding_photos_insert_own" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'client-onboarding-photos'::"text") AND ("split_part"("name", '/'::"text", 2) = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("split_part"("name", '/'::"text", 4) = ANY (ARRAY['front.webp'::"text", 'side.webp'::"text", 'back.webp'::"text"])) AND (EXISTS ( SELECT 1
   FROM "public"."clients" "client"
  WHERE ((("client"."workspace_id")::"text" = "split_part"("objects"."name", '/'::"text", 1)) AND ("client"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("client"."id")::"text" = "split_part"("objects"."name", '/'::"text", 3)) AND ("client"."status" = 'active'::"public"."client_status"))))));



CREATE POLICY "client_onboarding_photos_select_accessible" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'client-onboarding-photos'::"text") AND ((EXISTS ( SELECT 1
   FROM ("public"."clients" "client"
     JOIN "public"."workspaces" "workspace" ON (("workspace"."id" = "client"."workspace_id")))
  WHERE ((("client"."workspace_id")::"text" = "split_part"("objects"."name", '/'::"text", 1)) AND (("client"."user_id")::"text" = "split_part"("objects"."name", '/'::"text", 2)) AND (("client"."id")::"text" = "split_part"("objects"."name", '/'::"text", 3)) AND ("workspace"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (("split_part"("name", '/'::"text", 2) = (( SELECT "auth"."uid"() AS "uid"))::"text") AND (EXISTS ( SELECT 1
   FROM "public"."workspace_members" "member"
  WHERE ((("member"."workspace_id")::"text" = "split_part"("objects"."name", '/'::"text", 1)) AND ("member"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("member"."role" = 'client'::"public"."workspace_role") AND ("member"."status" = 'active'::"public"."membership_status"))))))));



CREATE POLICY "client_onboarding_photos_update_own" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'client-onboarding-photos'::"text") AND ("split_part"("name", '/'::"text", 2) = (( SELECT "auth"."uid"() AS "uid"))::"text"))) WITH CHECK ((("bucket_id" = 'client-onboarding-photos'::"text") AND ("split_part"("name", '/'::"text", 2) = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("split_part"("name", '/'::"text", 4) = ANY (ARRAY['front.webp'::"text", 'side.webp'::"text", 'back.webp'::"text"])) AND (EXISTS ( SELECT 1
   FROM "public"."clients" "client"
  WHERE ((("client"."workspace_id")::"text" = "split_part"("objects"."name", '/'::"text", 1)) AND ("client"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("client"."id")::"text" = "split_part"("objects"."name", '/'::"text", 3)) AND ("client"."status" = 'active'::"public"."client_status"))))));
