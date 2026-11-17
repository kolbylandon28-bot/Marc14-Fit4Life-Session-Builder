CREATE OR REPLACE FUNCTION public.fit4life_email_is_preapproved(check_email text, target_organization uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
      from public.client_profiles p
     where coalesce(p.status, 'active') <> 'archived'
       and (target_organization is null or p.organization_id = target_organization)
       and (
            lower(p.email) = lower(btrim(check_email))
         or lower(p.booking_email) = lower(btrim(check_email))
       )
  );
$function$
