CREATE OR REPLACE FUNCTION public.list_fit4life_trainer_audits(org_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id text, payload jsonb, updated_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select a.id, a.payload, a.updated_at
    from public.trainer_audits a
   where a.organization_id = public.fit4life_active_org(org_id)
     and a.organization_id in (
           select m.organization_id from public.memberships m
            where m.user_id = auth.uid() and m.role = 'owner' and m.is_active
         )
   order by a.audit_date desc nulls last, a.updated_at desc;
$function$
