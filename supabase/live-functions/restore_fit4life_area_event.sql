CREATE OR REPLACE FUNCTION public.restore_fit4life_area_event(event_id uuid, reason text DEFAULT NULL::text, org_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  org uuid := public.fit4life_active_org(org_id);
  event_area text;
begin
  select e.area_key into event_area from public.area_events e
   where e.id = event_id and e.organization_id = org and e.deleted_at is not null;
  if event_area is null then
    raise exception 'That event is not in the archive';
  end if;
  if not public.fit4life_can('shifts.create', event_area, org) then
    raise exception 'You are not allowed to change that area''s calendar';
  end if;
  if btrim(coalesce(reason, '')) = '' then
    raise exception 'Say why this is coming back';
  end if;
  update public.area_events e
     set deleted_at = null, deleted_by = null, delete_reason = null
   where e.id = event_id and e.organization_id = org;
  return true;
end;
$function$
