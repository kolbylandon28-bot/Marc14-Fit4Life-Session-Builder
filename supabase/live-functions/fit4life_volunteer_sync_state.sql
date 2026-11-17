CREATE OR REPLACE FUNCTION public.fit4life_volunteer_sync_state(org_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(last_synced_at timestamp with time zone, last_rows integer, last_error text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select s.last_synced_at, s.last_rows, s.last_error
    from public.volunteer_sync_state s
   where s.organization_id = public.fit4life_active_org(org_id);
$function$
