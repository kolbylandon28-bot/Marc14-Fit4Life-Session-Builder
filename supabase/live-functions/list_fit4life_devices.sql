CREATE OR REPLACE FUNCTION public.list_fit4life_devices(org_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(device_id text, name text, area_key text, approved_at timestamp with time zone, revoked_at timestamp with time zone, last_seen_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select d.device_id, d.name, d.area_key, d.approved_at, d.revoked_at, d.last_seen_at
    from public.approved_devices d
   where d.organization_id = public.fit4life_active_org(org_id)
     and public.is_org_owner(d.organization_id)
   order by d.last_seen_at desc nulls last;
$function$
