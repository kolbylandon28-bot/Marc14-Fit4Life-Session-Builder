CREATE OR REPLACE FUNCTION public.protect_fit4life_client_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  admitting boolean := coalesce(current_setting('fit4life.client_admission', true), '') = '1';
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  if public.is_org_owner(old.organization_id) then
    return new;
  end if;

  -- admission only: inactive to active, never into or out of archived
  if admitting
     and old.status = 'inactive'
     and new.status = 'active' then
    return new;
  end if;

  raise exception 'Only an active owner can archive or reactivate a client profile.';
end;
$function$
