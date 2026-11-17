CREATE OR REPLACE FUNCTION public.clone_organization(new_slug text, new_name text, new_org_type text DEFAULT 'gym'::text, new_owner uuid DEFAULT NULL::uuid, source_slug text DEFAULT 'skeleton'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  src public.organizations;
  made uuid;
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

  -- no ownerless branch, ever
  if owner_id is null then
    raise exception 'An owner user id is required.';
  end if;

  select * into src from public.organizations where slug = source_slug;
  if src.id is null then
    raise exception 'source branch % not found', source_slug using errcode = '22023';
  end if;

  -- closed at birth, opened by the owner; a trainer-created email still gets in
  insert into public.organizations
    (slug, name, org_type, is_template, modules, config, brand_config, equipment_config, public_registration_enabled)
  values
    (new_slug, new_name, new_org_type, false,
     public.fit4life_module_preset(new_org_type),
     coalesce(src.config, '{}'::jsonb),
     coalesce(src.brand_config, '{}'::jsonb) || jsonb_build_object('name', new_name),
     coalesce(src.equipment_config, '{}'::jsonb),
     false)
  returning id into made;

  -- areas only if facility on
  if coalesce((public.fit4life_module_preset(new_org_type) ->> 'facility')::boolean, false) then
    insert into public.work_areas (organization_id, area_key, name, sort_order, is_active, is_coaching, has_events)
    select made, a.area_key, a.name, a.sort_order, a.is_active, a.is_coaching, a.has_events
      from public.work_areas a
     where a.organization_id = src.id;
  end if;

  insert into public.memberships (organization_id, user_id, role, is_active)
  values (made, owner_id, 'owner', true);

  return made;
end;
$function$
