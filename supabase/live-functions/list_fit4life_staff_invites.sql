CREATE OR REPLACE FUNCTION public.list_fit4life_staff_invites(org_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(email text, full_name text, role text, areas text[], created_at timestamp with time zone, accepted_at timestamp with time zone, revoked_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select i.email, i.full_name, i.role, i.areas, i.created_at, i.accepted_at, i.revoked_at
    from public.staff_invites i
   where i.organization_id = public.fit4life_active_org(org_id)
     and i.organization_id in (
           select m.organization_id from public.memberships m
            where m.user_id = auth.uid() and m.role = 'owner' and m.is_active
         )
   order by i.created_at desc;
$function$
