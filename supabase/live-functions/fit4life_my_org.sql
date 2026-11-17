CREATE OR REPLACE FUNCTION public.fit4life_my_org()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.fit4life_active_org(null);
$function$
