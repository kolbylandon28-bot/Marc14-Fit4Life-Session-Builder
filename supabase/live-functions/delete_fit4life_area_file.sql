CREATE OR REPLACE FUNCTION public.delete_fit4life_area_file(file_id uuid, org_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  org uuid := public.fit4life_active_org(org_id);
begin
  if not public.is_org_owner(org) then
    raise exception 'Only an owner can change the files';
  end if;
  update public.area_files f set is_active = false, updated_at = now()
   where f.id = file_id and f.organization_id = org;
  return true;
end;
$function$
