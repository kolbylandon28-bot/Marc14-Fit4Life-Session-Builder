CREATE OR REPLACE FUNCTION public.list_fit4life_shifts(area text DEFAULT NULL::text, from_day date DEFAULT NULL::date, to_day date DEFAULT NULL::date, org_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, area_key text, user_id uuid, staff_name text, starts_at timestamp with time zone, ends_at timestamp with time zone, note text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select s.id, s.area_key, s.user_id, s.staff_name, s.starts_at, s.ends_at, s.note
    from public.work_shifts s
   where s.organization_id = public.fit4life_active_org(org_id)
     and s.deleted_at is null
     and (area is null or s.area_key = area)
     and (from_day is null or s.starts_at >= from_day::timestamptz)
     and (to_day is null or s.starts_at < (to_day + 1)::timestamptz)
   order by s.starts_at;
$function$
