CREATE OR REPLACE FUNCTION public.grant_fit4life_staff_account(target_email text, target_display_name text, target_role text DEFAULT 'trainer'::text, change_reason text DEFAULT 'Owner granted staff access'::text, org_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  owner_organization uuid;
  staff_user auth.users%rowtype;
  clean_name text := trim(coalesce(target_display_name, ''));
  clean_role text := lower(trim(coalesce(target_role, '')));
begin
  owner_organization := public.fit4life_active_org(org_id);

  if owner_organization is null then
    raise exception 'Only an active gym owner can grant trainer or owner access.';
  end if;

  -- owner of THIS org, not owner somewhere
  if not public.is_org_owner(owner_organization) then
    raise exception 'Only an active gym owner can grant trainer or owner access.';
  end if;

  if clean_role not in ('owner', 'trainer') then
    raise exception 'Staff access must be owner or trainer.';
  end if;

  if char_length(clean_name) < 2 then
    raise exception 'Enter the staff display name.';
  end if;

  select * into staff_user
  from auth.users
  where lower(email) = lower(trim(target_email))
  limit 1;

  if staff_user.id is null then
    raise exception 'No Supabase login matches that email. The person must create and verify a login first.';
  end if;

  if staff_user.email_confirmed_at is null then
    raise exception 'The staff member must verify their own email before access is granted.';
  end if;

  if exists (
    select 1 from public.memberships membership
    where membership.organization_id = owner_organization
      and membership.user_id = staff_user.id
      and membership.role = 'client'
      and membership.is_active
  ) or exists (
    select 1 from public.client_profiles profile
    where profile.organization_id = owner_organization
      and profile.auth_user_id = staff_user.id
      and profile.status = 'active'
  ) then
    raise exception 'Use a separate login for staff access; this account is connected to a client profile.';
  end if;

  perform set_config(
    'fit4life.membership_reason',
    left(coalesce(nullif(trim(change_reason), ''), 'Owner granted ' || clean_role || ' access'), 500),
    true
  );

  insert into public.memberships (organization_id, user_id, role, is_active)
  values (owner_organization, staff_user.id, clean_role, true)
  on conflict (organization_id, user_id)
  do update set role = excluded.role, is_active = true, updated_at = now();

  insert into public.staff_profiles (organization_id, user_id, display_name, is_active)
  values (owner_organization, staff_user.id, clean_name, true)
  on conflict (organization_id, user_id)
  do update set display_name = excluded.display_name, is_active = true, updated_at = now();

  -- display metadata only, never a role check
  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object('display_name', clean_name)
  where id = staff_user.id;

  update public.registration_requests
  set status = 'approved',
      reviewed_by = (select auth.uid()),
      reviewed_at = now(),
      review_note = 'Approved as ' || clean_role || ' by a gym owner',
      updated_at = now()
  where organization_id = owner_organization
    and user_id = staff_user.id
    and requested_role = 'trainer'
    and status = 'pending';

  return staff_user.id;
end;
$function$
