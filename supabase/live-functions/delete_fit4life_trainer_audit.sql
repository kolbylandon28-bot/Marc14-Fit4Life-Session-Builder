CREATE OR REPLACE FUNCTION public.delete_fit4life_trainer_audit(target_organization uuid, target_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_org_owner(target_organization) then
    raise exception 'Only an owner can delete a trainer audit';
  end if;
  delete from public.trainer_audits where id = target_id and organization_id = target_organization;
  return true;
end;
$function$
