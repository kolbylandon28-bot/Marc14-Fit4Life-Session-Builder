CREATE OR REPLACE FUNCTION public.set_fit4life_staff_areas(target_organization uuid, target_user uuid, areas text[])
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_org_owner(target_organization) then
    raise exception 'Only an owner can change who works where';
  end if;
  delete from public.staff_areas where organization_id = target_organization and user_id = target_user;
  insert into public.staff_areas (organization_id, user_id, area_key)
  select target_organization, target_user, unnest(coalesce(areas, '{}'))
  on conflict do nothing;
  return true;
end;
$function$
