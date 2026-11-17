CREATE OR REPLACE FUNCTION public.is_org_owner(target_organization uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.memberships membership
    where membership.organization_id = target_organization
      and membership.user_id = (select auth.uid())
      and membership.role = 'owner'
      and membership.is_active
  );
$function$
