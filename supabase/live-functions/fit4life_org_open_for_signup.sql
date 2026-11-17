CREATE OR REPLACE FUNCTION public.fit4life_org_open_for_signup(target_organization uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- never the skeleton; open branch, or an address already on file
  select exists (
    select 1
    from public.organizations o
    where o.id = target_organization
      and not o.is_template
      and (
        o.public_registration_enabled
        or public.fit4life_email_is_preapproved((select auth.jwt() ->> 'email'), o.id)
      )
  );
$function$
