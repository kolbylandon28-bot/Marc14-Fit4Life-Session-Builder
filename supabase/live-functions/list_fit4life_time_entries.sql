CREATE OR REPLACE FUNCTION public.list_fit4life_time_entries(from_day date DEFAULT NULL::date, to_day date DEFAULT NULL::date, org_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, area_key text, user_id uuid, clock_in timestamp with time zone, clock_out timestamp with time zone, estimated boolean, confirmed_at timestamp with time zone, note text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select t.id, t.area_key, t.user_id, t.clock_in, t.clock_out, t.estimated, t.confirmed_at, t.note
    from public.time_entries t
   where t.organization_id = public.fit4life_active_org(org_id)
     and (public.fit4life_can('hours.view.all', t.area_key, org_id) or t.user_id = auth.uid())
     and (from_day is null or t.clock_in >= from_day::timestamptz)
     and (to_day is null or t.clock_in < (to_day + 1)::timestamptz)
   order by t.clock_in desc;
$function$
