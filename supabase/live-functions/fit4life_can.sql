CREATE OR REPLACE FUNCTION public.fit4life_can(capability text, area text DEFAULT NULL::text, org_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  org uuid := public.fit4life_active_org(org_id);
  is_owner boolean;
begin
  if org is null then
    return false;
  end if;
  is_owner := public.is_org_owner(org);
  if is_owner then
    return true;
  end if;

  if capability in ('shifts.view.all', 'shifts.view.own', 'hours.view.own', 'hours.clock.self') then
    return true;
  end if;

  if capability in ('shifts.create', 'shifts.edit.any', 'shifts.edit.own', 'schedule.publish') then
    return exists (
      select 1 from public.staff_areas s
       where s.organization_id = org and s.user_id = auth.uid() and s.can_schedule
         and (area is null or s.area_key = area or s.area_key = '*')
    );
  end if;

  if capability in ('hours.view.all', 'hours.edit', 'hours.confirm', 'hours.export') then
    return exists (
      select 1 from public.staff_areas s
       where s.organization_id = org and s.user_id = auth.uid() and s.can_edit_hours
         and (area is null or s.area_key = area or s.area_key = '*')
    );
  end if;

  return false;
end;
$function$
