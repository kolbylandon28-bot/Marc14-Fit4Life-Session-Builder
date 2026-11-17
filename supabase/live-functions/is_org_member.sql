CREATE OR REPLACE FUNCTION public.is_org_member(target_organization uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.memberships m
    where m.organization_id = target_organization
      and m.user_id = auth.uid()
      and m.is_active
  );
$function$
