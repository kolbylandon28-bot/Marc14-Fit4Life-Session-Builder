CREATE OR REPLACE FUNCTION public.set_fit4life_device(device text, device_name text, area text, approved boolean, org_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  org uuid := public.fit4life_active_org(org_id);
begin
  if not public.is_org_owner(org) then
    raise exception 'Only an owner can approve a device';
  end if;
  update public.approved_devices
     set name = coalesce(nullif(btrim(coalesce(device_name, '')), ''), name),
         area_key = nullif(btrim(coalesce(area, '')), ''),
         approved_at = case when approved then coalesce(approved_at, now()) else null end,
         approved_by = case when approved then auth.uid() else null end,
         revoked_at = case when approved then null else now() end
   where organization_id = org and device_id = device;
  return true;
end;
$function$
