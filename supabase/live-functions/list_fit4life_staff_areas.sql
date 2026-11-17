CREATE OR REPLACE FUNCTION public.list_fit4life_staff_areas(org_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(user_id uuid, area_key text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select s.user_id, s.area_key
    from public.staff_areas s
   where s.organization_id = public.fit4life_active_org(org_id)
     and (s.user_id = auth.uid() or public.is_org_owner(s.organization_id));
$function$
