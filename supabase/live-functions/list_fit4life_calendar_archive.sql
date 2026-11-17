CREATE OR REPLACE FUNCTION public.list_fit4life_calendar_archive(org_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, source text, area_key text, title text, kind text, starts_at timestamp with time zone, ends_at timestamp with time zone, deleted_at timestamp with time zone, deleted_by uuid, delete_reason text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select s.id, 'shift'::text, s.area_key, coalesce(s.staff_name, 'Shift'), 'shift'::text,
         s.starts_at, s.ends_at, s.deleted_at, s.deleted_by, s.delete_reason
    from public.work_shifts s
   where s.organization_id = public.fit4life_active_org(org_id) and s.deleted_at is not null
  union all
  select e.id, 'area-event'::text, e.area_key, e.title, e.kind,
         e.starts_at, e.ends_at, e.deleted_at, e.deleted_by, e.delete_reason
    from public.area_events e
   where e.organization_id = public.fit4life_active_org(org_id) and e.deleted_at is not null
  order by 8 desc;
$function$
