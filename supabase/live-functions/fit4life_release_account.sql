CREATE OR REPLACE FUNCTION public.fit4life_release_account(check_email text, target_organization uuid DEFAULT NULL::uuid, all_branches boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
  uid        uuid;
  staff      int;
  unlinked   int;
  memberships_removed int;
  requests_removed    int;
  every_branch boolean := coalesce(all_branches, false);
begin
  -- refuse to guess
  if not every_branch and target_organization is null then
    raise exception 'pass target_organization, or all_branches => true to release every branch'
      using errcode = '22023';
  end if;

  -- two readings, never silently the destructive one
  if every_branch and target_organization is not null then
    raise exception 'pass target_organization, or all_branches => true, not both'
      using errcode = '22023';
  end if;

  select id into uid
    from auth.users
   where lower(btrim(email)) = lower(btrim(check_email));

  if uid is null then
    return 'No account with that address. Nothing to do.';
  end if;

  select count(*) into staff
    from public.memberships
   where user_id = uid
     and role in ('owner', 'trainer')
     and (every_branch or organization_id = target_organization);

  if staff > 0 then
    return 'REFUSED: that is a staff account, not a client. Nothing changed.';
  end if;

  update public.client_profiles
     set auth_user_id = null
   where auth_user_id = uid
     and (every_branch or organization_id = target_organization);
  get diagnostics unlinked = row_count;

  delete from public.registration_requests
   where user_id = uid
     and (every_branch or organization_id = target_organization);
  get diagnostics requests_removed = row_count;

  delete from public.memberships
   where user_id = uid
     and (every_branch or organization_id = target_organization);
  get diagnostics memberships_removed = row_count;

  return 'Released in ' || (case when every_branch then 'every branch' else 'that one branch' end)
      || '. Profiles unlinked: ' || unlinked
      || '. Memberships removed: ' || memberships_removed
      || '. Signup requests removed: ' || requests_removed
      || '. The profile itself was kept.'
      || (case when every_branch then ' Now delete the user in Authentication.' else '' end);
end;
$function$
