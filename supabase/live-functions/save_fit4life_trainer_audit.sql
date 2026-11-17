CREATE OR REPLACE FUNCTION public.save_fit4life_trainer_audit(target_organization uuid, payload jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_org_owner(target_organization) then
    raise exception 'Only an owner can save a trainer audit';
  end if;
  insert into public.trainer_audits (id, organization_id, trainer_key, audit_date, flagged, payload, updated_at)
  values (
    payload->>'id', target_organization, payload->>'trainerKey',
    nullif(payload->>'date','')::date, coalesce((payload->>'flagged')::boolean, false), payload, now()
  )
  on conflict (id) do update
     set trainer_key = excluded.trainer_key,
         audit_date  = excluded.audit_date,
         flagged     = excluded.flagged,
         payload     = excluded.payload,
         updated_at  = now()
   where public.trainer_audits.organization_id = target_organization;
  return true;
end;
$function$
