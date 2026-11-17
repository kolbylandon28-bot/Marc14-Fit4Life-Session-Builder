CREATE OR REPLACE FUNCTION public.delete_fit4life_shift(shift_id uuid, reason text DEFAULT NULL::text, org_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  org uuid := public.fit4life_active_org(org_id);
  shift_area text;
begin
  select w.area_key into shift_area from public.work_shifts w
   where w.id = shift_id and w.organization_id = org and w.deleted_at is null;
  if shift_area is null then
    return true;
  end if;
  if not public.fit4life_can('shifts.edit.any', shift_area, org) then
    raise exception 'You are not allowed to change the schedule for that area';
  end if;
  if btrim(coalesce(reason, '')) = '' then
    raise exception 'Say why this is being removed';
  end if;
  update public.work_shifts w
     set deleted_at = now(), deleted_by = auth.uid(), delete_reason = btrim(reason),
         history = w.history || jsonb_build_object('at', now(), 'by', auth.uid(), 'action', 'deleted', 'reason', btrim(reason))
   where w.id = shift_id and w.organization_id = org;
  return true;
end;
$function$
