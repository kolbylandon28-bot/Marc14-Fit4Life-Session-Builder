CREATE OR REPLACE FUNCTION public.list_fit4life_work_areas(org_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(area_key text, name text, sort_order integer, is_active boolean, is_coaching boolean, has_events boolean, people bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select a.area_key, a.name, a.sort_order, a.is_active, a.is_coaching, a.has_events,
         (select count(*) from public.staff_areas s
           where s.organization_id = a.organization_id and s.area_key = a.area_key) as people
    from public.work_areas a
   where a.organization_id = public.fit4life_active_org(org_id)
   order by a.sort_order, a.name;
$function$
