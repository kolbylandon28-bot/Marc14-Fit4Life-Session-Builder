CREATE OR REPLACE FUNCTION public.save_fit4life_work_area(target_organization uuid, area text, area_name text, position_in_list integer DEFAULT 0, active boolean DEFAULT true, coaching boolean DEFAULT false, events boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  clean_key text := lower(regexp_replace(btrim(coalesce(area, area_name)), '[^a-zA-Z0-9]+', '-', 'g'));
begin
  if not public.is_org_owner(target_organization) then
    raise exception 'Only an owner can change the work areas';
  end if;
  if clean_key is null or clean_key = '' or btrim(coalesce(area_name,'')) = '' then
    raise exception 'An area needs a name';
  end if;
  insert into public.work_areas (organization_id, area_key, name, sort_order, is_active, is_coaching, has_events)
  values (target_organization, clean_key, btrim(area_name), coalesce(position_in_list, 0), coalesce(active, true), coalesce(coaching, false), coalesce(events, false))
  on conflict (organization_id, area_key) do update
     set name = excluded.name, sort_order = excluded.sort_order, is_active = excluded.is_active,
         is_coaching = excluded.is_coaching, has_events = excluded.has_events;
  return true;
end;
$function$
