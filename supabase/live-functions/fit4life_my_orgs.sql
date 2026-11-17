CREATE OR REPLACE FUNCTION public.fit4life_my_orgs()
 RETURNS TABLE(organization_id uuid, slug text, name text, role text, org_type text, modules jsonb, config jsonb, brand_config jsonb, is_template boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select o.id,
         o.slug,
         o.name,
         m.role,
         coalesce(o.org_type, 'gym'),
         coalesce(o.modules, '{}'::jsonb),
         coalesce(o.config, '{}'::jsonb),
         coalesce(o.brand_config, '{}'::jsonb),
         coalesce(o.is_template, false)
    from public.memberships m
    join public.organizations o on o.id = m.organization_id
   where m.user_id = auth.uid()
     and m.is_active
   order by case m.role when 'owner' then 0 when 'trainer' then 1 else 2 end,
            o.name;
$function$
