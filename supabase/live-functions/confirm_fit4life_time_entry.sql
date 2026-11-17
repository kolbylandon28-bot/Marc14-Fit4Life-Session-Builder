CREATE OR REPLACE FUNCTION public.confirm_fit4life_time_entry(entry uuid, new_in timestamp with time zone DEFAULT NULL::timestamp with time zone, new_out timestamp with time zone DEFAULT NULL::timestamp with time zone, org_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  org uuid := public.fit4life_active_org(org_id);
  row_area text;
  before jsonb;
begin
  select t.area_key, to_jsonb(t) into row_area, before
    from public.time_entries t where t.id = entry and t.organization_id = org;
  if row_area is null then
    raise exception 'That time entry is not in this gym';
  end if;
  if not public.fit4life_can('hours.confirm', row_area, org) then
    raise exception 'You are not allowed to change timesheets for that area';
  end if;
  update public.time_entries t
     set clock_in = coalesce(new_in, t.clock_in),
         clock_out = coalesce(new_out, t.clock_out),
         estimated = case when new_in is not null or new_out is not null then false else t.estimated end,
         confirmed_at = now(), confirmed_by = auth.uid(),
         history = t.history || jsonb_build_object('at', now(), 'by', auth.uid(), 'was',
           jsonb_build_object('clock_in', before->>'clock_in', 'clock_out', before->>'clock_out', 'estimated', before->>'estimated'))
   where t.id = entry and t.organization_id = org;
  return true;
end;
$function$
