alter table public.workout_exercises
add column target_load text,
add column demo_url text;

alter table public.workout_exercises
add constraint workout_exercises_target_load_length
check (target_load is null or char_length(btrim(target_load)) between 1 and 80),
add constraint workout_exercises_demo_url_length
check (demo_url is null or char_length(btrim(demo_url)) between 8 and 2048);

grant insert (target_load, demo_url), update (target_load, demo_url)
on public.workout_exercises
to authenticated;
