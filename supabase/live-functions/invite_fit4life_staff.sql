CREATE OR REPLACE FUNCTION public.invite_fit4life_staff(target_organization uuid, invite_email text, invite_name text DEFAULT NULL::text, invite_role text DEFAULT 'trainer'::text, invite_areas text[] DEFAULT '{}'::text[])
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  clean_email text := lower(btrim(invite_email));
  clean_role text := lower(coalesce(nullif(btrim(invite_role), ''), 'trainer'));
begin
  if not public.is_org_owner(target_organization) then
    raise exception 'Only an owner can invite staff';
  end if;
  if clean_email is null or position('@' in clean_email) < 2 then
    raise exception 'A valid email is required';
  end if;
  if clean_role not in ('trainer','staff') then
    raise exception 'A new account is invited as trainer or staff';
  end if;
  if array_position(coalesce(invite_areas, '{}'), '*') is not null then
    invite_areas := array['*'];
  end if;
  insert into public.staff_invites (organization_id, email, full_name, role, areas, invited_by)
  values (target_organization, clean_email, nullif(btrim(coalesce(invite_name,'')),''), clean_role, coalesce(invite_areas, '{}'), auth.uid())
  on conflict (organization_id, lower(email)) do update
     set full_name = coalesce(excluded.full_name, public.staff_invites.full_name),
         role = excluded.role,
         areas = excluded.areas,
         invited_by = excluded.invited_by,
         created_at = now(),
         revoked_at = null;
  return true;
end;
$function$
