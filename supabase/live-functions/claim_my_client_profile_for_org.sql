CREATE OR REPLACE FUNCTION public.claim_my_client_profile_for_org(target_organization uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  current_user_id uuid := auth.uid();
  current_email citext := nullif(auth.jwt() ->> 'email', '')::citext;
  claimed_profile public.client_profiles%rowtype;
  existing_role text;
begin
  if current_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  if current_email is null then
    raise exception 'Your account does not have a verified email.';
  end if;

  -- refuse to guess
  if target_organization is null then
    raise exception 'an organization is required' using errcode = '22023';
  end if;

  -- booking-import address in booking_email
  -- this login's own row first, then the primary address; never the oldest
  select * into claimed_profile
  from public.client_profiles profile
  where profile.organization_id = target_organization
    and (
      profile.email = current_email
      or lower(btrim(coalesce(profile.booking_email, ''))) = lower(btrim(current_email::text))
    )
    and (profile.auth_user_id is null or profile.auth_user_id = current_user_id)
    and profile.status = 'active'
  order by (profile.auth_user_id is not distinct from current_user_id) desc,
           (profile.email is not distinct from current_email) desc
  limit 1
  for update;

  if claimed_profile.id is null then
    raise exception 'No trainer-created profile matches this email.';
  end if;

  -- no client claim over a non-client seat, active or not
  select membership.role into existing_role
  from public.memberships membership
  where membership.organization_id = target_organization
    and membership.user_id = current_user_id
  for update;

  if existing_role is not null and existing_role <> 'client' then
    raise exception 'this login already holds % access in that branch; use a separate login for a client profile', existing_role
      using errcode = '42501';
  end if;

  update public.client_profiles
  set auth_user_id = current_user_id
  where id = claimed_profile.id
    and organization_id = target_organization;

  insert into public.memberships (organization_id, user_id, role, is_active)
  values (target_organization, current_user_id, 'client', true)
  on conflict (organization_id, user_id)
  do update set
    role = 'client',
    is_active = true,
    updated_at = now();

  return claimed_profile.id;
end;
$function$
