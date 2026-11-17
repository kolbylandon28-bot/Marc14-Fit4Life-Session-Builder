CREATE OR REPLACE FUNCTION public.update_my_fit4life_staff_name(target_display_name text, org_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  staff_organization uuid;
  clean_name text := trim(coalesce(target_display_name, ''));
begin
  staff_organization := public.fit4life_active_org(org_id);

  if staff_organization is null then
    raise exception 'Trainer access is required.';
  end if;

  -- staff in THIS org, not staff somewhere
  if not public.is_org_trainer(staff_organization) then
    raise exception 'Trainer access is required.';
  end if;

  if char_length(clean_name) < 2 then
    raise exception 'Enter the name clients should see.';
  end if;

  insert into public.staff_profiles (organization_id, user_id, display_name, is_active)
  values (staff_organization, auth.uid(), clean_name, true)
  on conflict (organization_id, user_id)
  do update set display_name = excluded.display_name, is_active = true, updated_at = now();

  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object('display_name', clean_name)
  where id = auth.uid();

  return true;
end;
$function$
