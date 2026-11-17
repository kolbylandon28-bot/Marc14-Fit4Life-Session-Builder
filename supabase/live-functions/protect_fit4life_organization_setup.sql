CREATE OR REPLACE FUNCTION public.protect_fit4life_organization_setup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if (old.brand_config is distinct from new.brand_config
      or old.equipment_config is distinct from new.equipment_config)
     and coalesce((select auth.role()), '') <> 'service_role'
     and not public.is_org_owner(old.id) then
    raise exception 'Only an active owner can change the shared gym theme, branding, or equipment.';
  end if;
  return new;
end;
$function$
