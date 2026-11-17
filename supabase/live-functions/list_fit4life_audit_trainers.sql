CREATE OR REPLACE FUNCTION public.list_fit4life_audit_trainers(org_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id text, payload jsonb, updated_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select t.id, t.payload, t.updated_at
    from public.audit_trainers t
   where t.organization_id = public.fit4life_active_org(org_id)
     and t.organization_id in (
           select m.organization_id from public.memberships m
            where m.user_id = auth.uid() and m.role = 'owner' and m.is_active
         )
   order by t.updated_at desc;
$function$
