CREATE OR REPLACE FUNCTION public.update_my_organization_setup(target_organization uuid, new_brand_config jsonb, new_equipment_config jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  saved_organization jsonb;
begin
  if not public.is_org_owner(target_organization) then
    raise exception 'Only an active owner can change the shared gym theme, branding, or equipment.';
  end if;

  update public.organizations as organization
  set brand_config = coalesce(new_brand_config, organization.brand_config, '{}'::jsonb),
      equipment_config = coalesce(new_equipment_config, organization.equipment_config, '{}'::jsonb)
  where organization.id = target_organization
  returning pg_catalog.jsonb_build_object(
    'organization_id', organization.id,
    'slug', organization.slug,
    'name', organization.name,
    'brand_config', organization.brand_config,
    'equipment_config', organization.equipment_config,
    'public_registration_enabled', organization.public_registration_enabled
  ) into saved_organization;

  if saved_organization is null then
    raise exception 'The shared gym organization could not be found.';
  end if;

  return saved_organization;
end;
$function$
