CREATE OR REPLACE FUNCTION public.register_fit4life_device(device text, device_name text, org_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  org uuid := public.fit4life_active_org(org_id);
begin
  if org is null or coalesce(btrim(device), '') = '' then
    return false;
  end if;
  insert into public.approved_devices (organization_id, device_id, name, last_seen_at)
  values (org, device, nullif(btrim(coalesce(device_name, '')), ''), now())
  on conflict (organization_id, device_id) do update
     set last_seen_at = now(),
         name = coalesce(public.approved_devices.name, excluded.name);
  return true;
end;
$function$
