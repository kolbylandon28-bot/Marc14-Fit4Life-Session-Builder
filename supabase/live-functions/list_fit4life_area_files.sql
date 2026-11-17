CREATE OR REPLACE FUNCTION public.list_fit4life_area_files(area text DEFAULT NULL::text, org_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, area_key text, category text, title text, body text, link_url text, link_label text, sort_order integer, updated_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select f.id, f.area_key, f.category, f.title, f.body, f.link_url, f.link_label, f.sort_order, f.updated_at
    from public.area_files f
   where f.organization_id = public.fit4life_active_org(org_id)
     and f.is_active
     and (area is null or f.area_key = area)
   order by f.category, f.sort_order, f.title;
$function$
