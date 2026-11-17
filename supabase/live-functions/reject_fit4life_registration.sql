CREATE OR REPLACE FUNCTION public.reject_fit4life_registration(target_request uuid, trainer_note text DEFAULT NULL::text, org_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  request_organization uuid;
  caller_organization uuid;
begin
  select organization_id into request_organization
  from public.registration_requests
  where id = target_request
    and requested_role = 'client'
    and status = 'pending'
  for update;

  if request_organization is null then
    raise exception 'Pending registration request was not found.';
  end if;

  -- branch the caller is standing in
  caller_organization := public.fit4life_active_org(org_id);

  -- no cross-branch rejections
  if caller_organization is distinct from request_organization then
    raise exception 'registration belongs to another organization'
      using errcode = '42501';
  end if;

  if not public.is_org_trainer(caller_organization) then
    raise exception 'Trainer access is required.';
  end if;

  update public.registration_requests
  set status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = nullif(trim(trainer_note), ''),
      updated_at = now()
  where id = target_request;

  return true;
end;
$function$
