CREATE OR REPLACE FUNCTION public.list_fit4life_trainer_tiers(org_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(user_id uuid, trainer_tier text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select m.user_id, m.trainer_tier
    from public.memberships m
   where m.organization_id = public.fit4life_active_org(org_id)
     and m.organization_id in (
           select mine.organization_id
             from public.memberships mine
            where mine.user_id = auth.uid()
              and mine.is_active
              and mine.role in ('owner','trainer')
         )
     and m.role in ('owner','trainer');
$function$
