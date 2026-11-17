CREATE OR REPLACE FUNCTION public.list_fit4life_volunteer_shifts(from_day date DEFAULT NULL::date, to_day date DEFAULT NULL::date, org_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(area_key text, shift_date date, starts_at timestamp with time zone, ends_at timestamp with time zone, names text[], open_spots integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select v.area_key, v.shift_date, v.starts_at, v.ends_at, v.names, v.open_spots
    from public.volunteer_shifts v
   where v.organization_id = public.fit4life_active_org(org_id)
     and (from_day is null or v.shift_date >= from_day)
     and (to_day is null or v.shift_date <= to_day)
   order by v.starts_at;
$function$
