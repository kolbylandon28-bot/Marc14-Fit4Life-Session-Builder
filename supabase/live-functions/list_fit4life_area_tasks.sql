CREATE OR REPLACE FUNCTION public.list_fit4life_area_tasks(area text DEFAULT NULL::text, on_day date DEFAULT NULL::date, org_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, area_key text, title text, detail text, repeats text, due_on date, assigned_to uuid, assigned_name text, sort_order integer, done_on date, done_by uuid, done_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select t.id, t.area_key, t.title, t.detail, t.repeats, t.due_on, t.assigned_to, t.assigned_name, t.sort_order,
         d.done_on, d.done_by, d.done_at
    from public.area_tasks t
    left join public.area_task_done d
      on d.task_id = t.id and d.done_on = coalesce(on_day, current_date)
   where t.organization_id = public.fit4life_active_org(org_id)
     and t.is_active
     and (area is null or t.area_key = area)
   order by t.sort_order, t.created_at;
$function$
