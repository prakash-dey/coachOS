-- Keep existing demo workspaces aligned with the current client/onboarding structure.
-- This is intentionally a forward-only repair so older applied migrations do not need edits.

update public.clients as client
set gender = private.demo_client_gender_from_name(client.first_name)
from public.workspaces as workspace
where workspace.id = client.workspace_id
  and workspace.is_demo
  and client.gender is distinct from private.demo_client_gender_from_name(client.first_name);

update public.client_intake_forms as intake
set
  front_photo_path = case
    when client.gender = 'male' then 'images/male_front_view.webp'
    else 'images/female_front_view.webp'
  end,
  side_photo_path = case
    when client.gender = 'male' then 'images/male_side_view.webp'
    else 'images/female_side_view.webp'
  end,
  back_photo_path = case
    when client.gender = 'male' then 'images/male_back_view.webp'
    else 'images/female_back_view.webp'
  end,
  document_pdf_path = null,
  updated_at = now()
from public.clients as client
join public.workspaces as workspace on workspace.id = client.workspace_id
where intake.workspace_id = client.workspace_id
  and intake.client_id = client.id
  and workspace.is_demo;

update public.check_ins as check_in
set
  front_photo_path = case
    when client.gender = 'male' then 'images/male_front_view.webp'
    else 'images/female_front_view.webp'
  end,
  side_photo_path = case
    when client.gender = 'male' then 'images/male_side_view.webp'
    else 'images/female_side_view.webp'
  end,
  back_photo_path = case
    when client.gender = 'male' then 'images/male_back_view.webp'
    else 'images/female_back_view.webp'
  end
from public.clients as client
join public.workspaces as workspace on workspace.id = client.workspace_id
where check_in.workspace_id = client.workspace_id
  and check_in.client_id = client.id
  and workspace.is_demo;
