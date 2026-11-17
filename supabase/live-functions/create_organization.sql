CREATE OR REPLACE FUNCTION public.create_organization(new_slug text, new_name text, new_org_type text DEFAULT 'employer'::text, new_owner uuid DEFAULT NULL::uuid, new_brand jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  created uuid;
  owner_id uuid := coalesce(new_owner, auth.uid());
  -- database role in the editor, no jwt
  db_admin boolean := exists (
    select 1 from pg_catalog.pg_roles r
    where r.rolname = session_user
      and (r.rolsuper or r.rolbypassrls or r.rolname = 'postgres')
  );
begin
  if not (public.is_platform_admin() or db_admin) then
    raise exception 'only a platform admin can create a branch' using errcode = '42501';
  end if;

  if owner_id is null then
    raise exception 'An owner user id is required.';
  end if;

  if new_org_type not in ('university','gym','employer') then
    raise exception 'org_type must be university, gym or employer.';
  end if;
  -- these two named here, not left to defaults
  insert into public.organizations (slug, name, org_type, brand_config, is_template, public_registration_enabled)
  values (lower(btrim(new_slug))::citext, btrim(new_name), new_org_type, coalesce(new_brand, '{}'::jsonb), false, true)
  returning id into created;
  insert into public.memberships (organization_id, user_id, role, is_active)
  values (created, owner_id, 'owner', true);
  return created;
end;
$function$
