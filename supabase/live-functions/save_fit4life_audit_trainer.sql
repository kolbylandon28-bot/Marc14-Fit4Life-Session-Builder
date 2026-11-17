CREATE OR REPLACE FUNCTION public.save_fit4life_audit_trainer(target_organization uuid, payload jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_org_owner(target_organization) then
    raise exception 'Only an owner can change the audit trainer list';
  end if;
  insert into public.audit_trainers (id, organization_id, trainer_key, payload, updated_at)
  values (payload->>'id', target_organization, lower(payload->>'key'), payload, now())
  on conflict (organization_id, trainer_key) do update
     set payload = excluded.payload, updated_at = now();
  return true;
end;
$function$
