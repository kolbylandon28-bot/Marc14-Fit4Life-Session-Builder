CREATE OR REPLACE FUNCTION public.close_fit4life_open_entries(max_hours integer DEFAULT 8, org_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  org uuid := public.fit4life_active_org(org_id);
  closed int := 0;
begin
  if not public.is_org_owner(org) then
    raise exception 'Only an owner can close open shifts';
  end if;
  with ends as (
    select t.id,
           coalesce(
             (select s.ends_at from public.work_shifts s
               where s.organization_id = t.organization_id and s.area_key = t.area_key
                 and s.user_id = t.user_id and s.ends_at > t.clock_in
               order by s.ends_at limit 1),
             t.clock_in + make_interval(hours => max_hours)
           ) as finish
      from public.time_entries t
     where t.organization_id = org and t.clock_out is null
       and t.clock_in < now() - interval '1 hour'
  )
  update public.time_entries t
     set clock_out = ends.finish, estimated = true
    from ends
   where t.id = ends.id and ends.finish < now();
  get diagnostics closed = row_count;
  return closed;
end;
$function$
