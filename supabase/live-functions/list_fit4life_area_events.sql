CREATE OR REPLACE FUNCTION public.list_fit4life_area_events(area text DEFAULT NULL::text, from_day date DEFAULT NULL::date, to_day date DEFAULT NULL::date, org_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, area_key text, title text, kind text, starts_at timestamp with time zone, ends_at timestamp with time zone, location text, capacity integer, lead_user_id uuid, lead_name text, note text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select e.id, e.area_key, e.title, e.kind, e.starts_at, e.ends_at, e.location, e.capacity, e.lead_user_id, e.lead_name, e.note
    from public.area_events e
   where e.organization_id = public.fit4life_active_org(org_id)
     and e.deleted_at is null
     and (area is null or e.area_key = area)
     and (from_day is null or e.starts_at >= from_day::timestamptz)
     and (to_day is null or e.starts_at < (to_day + 1)::timestamptz)
   order by e.starts_at;
$function$
