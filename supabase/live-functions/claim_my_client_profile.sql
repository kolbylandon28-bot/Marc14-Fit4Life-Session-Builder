CREATE OR REPLACE FUNCTION public.claim_my_client_profile()
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
  match_branches integer;
begin
  if current_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  if current_email is null then
    raise exception 'Your account does not have a verified email.';
  end if;

  -- per-branch unique now, so two branches possible for one login
  select count(distinct profile.organization_id) into match_branches
  from public.client_profiles profile
  where profile.email = current_email
    and profile.auth_user_id = current_user_id
    and profile.status = 'active';

  -- linked in two branches, nothing to pick on
  if match_branches > 1 then
    raise exception 'this login already holds an active client profile in % branches; open the one you want from its own branch link', match_branches
      using errcode = '22023';
  end if;

  -- one branch past the guard, one row per address per branch
  select * into claimed_profile
  from public.client_profiles profile
  where profile.email = current_email
    and profile.auth_user_id = current_user_id
    and profile.status = 'active'
  for update;

  if claimed_profile.id is null then
    select count(distinct profile.organization_id) into match_branches
    from public.client_profiles profile
    where profile.email = current_email
      and profile.auth_user_id is null
      and profile.status = 'active';

    -- unclaimed in two branches, nothing to pick on
    if match_branches > 1 then
      raise exception 'that email has an unclaimed client profile in % branches; a trainer should archive the wrong one or send that branch sign-in link', match_branches
        using errcode = '22023';
    end if;

    select * into claimed_profile
    from public.client_profiles profile
    where profile.email = current_email
      and profile.auth_user_id is null
      and profile.status = 'active'
    for update;
  end if;

  if claimed_profile.id is null then
    raise exception 'No trainer-created profile matches this email.';
  end if;

  -- no client claim over a non-client seat, active or not
  select membership.role into existing_role
  from public.memberships membership
  where membership.organization_id = claimed_profile.organization_id
    and membership.user_id = current_user_id
  for update;

  if existing_role is not null and existing_role <> 'client' then
    raise exception 'this login already holds % access in that branch; use a separate login for a client profile', existing_role
      using errcode = '42501';
  end if;

  update public.client_profiles
  set auth_user_id = current_user_id
  where id = claimed_profile.id;

  insert into public.memberships (organization_id, user_id, role, is_active)
  values (claimed_profile.organization_id, current_user_id, 'client', true)
  on conflict (organization_id, user_id)
  do update set
    role = 'client',
    is_active = true,
    updated_at = now();

  return claimed_profile.id;
end;
$function$
