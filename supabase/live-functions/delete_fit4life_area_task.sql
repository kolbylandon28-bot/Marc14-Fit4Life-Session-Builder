CREATE OR REPLACE FUNCTION public.delete_fit4life_area_task(task_id uuid, org_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  org uuid := public.fit4life_active_org(org_id);
begin
  if not public.is_org_owner(org) then
    raise exception 'Only an owner can change the task list';
  end if;
  update public.area_tasks t set is_active = false where t.id = task_id and t.organization_id = org;
  return true;
end;
$function$
