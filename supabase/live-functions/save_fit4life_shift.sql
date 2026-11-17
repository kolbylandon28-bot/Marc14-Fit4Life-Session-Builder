CREATE OR REPLACE FUNCTION public.save_fit4life_shift(area text, staff uuid, staff_label text, starts timestamp with time zone, ends timestamp with time zone, shift_note text DEFAULT NULL::text, shift_id uuid DEFAULT NULL::uuid, org_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  org uuid := public.fit4life_active_org(org_id);
  saved uuid;
  before jsonb;
begin
  if not public.fit4life_can('shifts.create', area, org) then
    raise exception 'You are not allowed to change the schedule for that area';
  end if;
  if ends <= starts then
    raise exception 'A shift has to end after it starts';
  end if;
  if shift_id is null then
    insert into public.work_shifts (organization_id, area_key, user_id, staff_name, starts_at, ends_at, note, created_by, updated_by)
    values (org, area, staff, nullif(btrim(coalesce(staff_label, '')), ''), starts, ends, nullif(btrim(coalesce(shift_note, '')), ''), auth.uid(), auth.uid())
    returning id into saved;
  else
    select to_jsonb(w) into before from public.work_shifts w where w.id = shift_id and w.organization_id = org;
    if before is null then
      raise exception 'That shift is not in this gym';
    end if;
    if not public.fit4life_can('shifts.edit.any', before->>'area_key', org) then
      raise exception 'You are not allowed to change the schedule for that area';
    end if;
    update public.work_shifts w
       set area_key = area, user_id = staff, staff_name = nullif(btrim(coalesce(staff_label, '')), ''),
           starts_at = starts, ends_at = ends, note = nullif(btrim(coalesce(shift_note, '')), ''),
           updated_at = now(), updated_by = auth.uid(),
           history = w.history || jsonb_build_object('at', now(), 'by', auth.uid(), 'was',
             jsonb_build_object('area_key', before->>'area_key', 'user_id', before->>'user_id',
               'starts_at', before->>'starts_at', 'ends_at', before->>'ends_at', 'note', before->>'note'))
     where w.id = shift_id and w.organization_id = org
     returning w.id into saved;
  end if;
  return saved;
end;
$function$
