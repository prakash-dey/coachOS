insert into public.super_admins (user_id)
select id
from auth.users
where lower(email) = 'grittaai.official@gmail.com'
on conflict (user_id) do nothing;
