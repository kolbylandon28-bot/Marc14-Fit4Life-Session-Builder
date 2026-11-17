CREATE OR REPLACE FUNCTION public.resolve_gym_portal(requested_slug text DEFAULT NULL::text, requested_hostname text DEFAULT NULL::text)
 RETURNS TABLE(organization_id uuid, slug text, name text, public_registration_enabled boolean, brand_config jsonb, equipment_config jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select o.id, o.slug::text, o.name, o.public_registration_enabled, o.brand_config, o.equipment_config
    from public.organizations o
   where case
           when requested_slug is not null then o.slug::text = lower(btrim(requested_slug))
           when requested_hostname is not null then o.config->>'hostname' = lower(btrim(requested_hostname))
           else coalesce((o.config->>'is_default')::boolean, false)
         end
   order by o.slug
   limit 1;
$function$
