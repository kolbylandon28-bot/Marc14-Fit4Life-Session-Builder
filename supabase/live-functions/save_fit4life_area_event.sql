CREATE OR REPLACE FUNCTION public.save_fit4life_area_event(area text, event_title text, event_kind text DEFAULT 'event'::text, starts timestamp with time zone DEFAULT now(), ends timestamp with time zone DEFAULT now(), event_location text DEFAULT NULL::text, event_capacity integer DEFAULT NULL::integer, event_lead uuid DEFAULT NULL::uuid, event_lead_name text DEFAULT NULL::text, event_note text DEFAULT NULL::text, event_id uuid DEFAULT NULL::uuid, org_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  org uuid := public.fit4life_active_org(org_id);
  saved uuid;
  clean_kind text := lower(btrim(coalesce(event_kind, 'event')));
begin
  if not public.is_org_owner(org) then
    raise exception 'Only an owner can change the calendar';
  end if;
  if btrim(coalesce(event_title, '')) = '' then
    raise exception 'An event needs a name';
  end if;
  if ends <= starts then
    raise exception 'An event has to end after it starts';
  end if;
  if clean_kind not in ('lesson', 'clinic', 'training', 'event', 'closure') then
    clean_kind := 'event';
  end if;
  if event_id is null then
    insert into public.area_events (organization_id, area_key, title, kind, starts_at, ends_at, location, capacity, lead_user_id, lead_name, note, created_by)
    values (org, area, btrim(event_title), clean_kind, starts, ends, nullif(btrim(coalesce(event_location, '')), ''), event_capacity,
            event_lead, nullif(btrim(coalesce(event_lead_name, '')), ''), nullif(btrim(coalesce(event_note, '')), ''), auth.uid())
    returning id into saved;
  else
    update public.area_events
       set area_key = area, title = btrim(event_title), kind = clean_kind, starts_at = starts, ends_at = ends,
           location = nullif(btrim(coalesce(event_location, '')), ''), capacity = event_capacity,
           lead_user_id = event_lead, lead_name = nullif(btrim(coalesce(event_lead_name, '')), ''),
           note = nullif(btrim(coalesce(event_note, '')), '')
     where id = event_id and organization_id = org
     returning id into saved;
  end if;
  return saved;
end;
$function$
