CREATE OR REPLACE FUNCTION public.fit4life_clock_in(area text, device text, org_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  org uuid := public.fit4life_active_org(org_id);
  allowed boolean;
  cleared boolean;
  entry public.time_entries%rowtype;
begin
  if org is null then
    return jsonb_build_object('ok', false, 'error', 'No gym for this account');
  end if;
  select exists (
    select 1 from public.staff_areas s
     where s.organization_id = org and s.user_id = auth.uid()
       and (s.area_key = area or s.area_key = '*')
  ) or public.is_org_owner(org) into cleared;
  if not cleared then
    return jsonb_build_object('ok', false, 'error', 'You are not cleared to work in this area');
  end if;
  select exists (
    select 1 from public.approved_devices d
     where d.organization_id = org and d.device_id = device
       and d.approved_at is not null and d.revoked_at is null
  ) into allowed;
  if not allowed then
    return jsonb_build_object('ok', false, 'error', 'This device is not approved for clocking in');
  end if;
  if exists (select 1 from public.time_entries t where t.organization_id = org and t.user_id = auth.uid() and t.clock_out is null) then
    return jsonb_build_object('ok', false, 'error', 'You are already clocked in');
  end if;
  insert into public.time_entries (organization_id, area_key, user_id, device_id)
  values (org, area, auth.uid(), device)
  returning * into entry;
  return jsonb_build_object('ok', true, 'id', entry.id, 'clock_in', entry.clock_in);
end;
$function$
