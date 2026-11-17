CREATE OR REPLACE FUNCTION public.fit4life_works_in_area(area text, org_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.staff_areas s
     where s.organization_id = public.fit4life_active_org(org_id)
       and s.user_id = auth.uid()
       and (s.area_key = area or s.area_key = '*')
  ) or public.is_org_owner(public.fit4life_active_org(org_id));
$function$
