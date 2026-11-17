CREATE OR REPLACE FUNCTION public.can_access_client(target_client uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.client_profiles c
    where c.id = target_client
      and (
        c.auth_user_id = auth.uid()
        or public.is_org_trainer(c.organization_id)
      )
  );
$function$
