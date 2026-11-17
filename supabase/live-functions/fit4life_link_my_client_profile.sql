CREATE OR REPLACE FUNCTION public.fit4life_link_my_client_profile(target_organization uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  caller_email text;
  match_count integer;
begin
  select lower(btrim(u.email)) into caller_email
    from auth.users u
   where u.id = auth.uid();

  if caller_email is null or caller_email = '' then
    return 0;
  end if;

  select count(*) into match_count
    from public.client_profiles p
   where p.auth_user_id is null
     and coalesce(p.status, 'active') <> 'archived'
     and (target_organization is null or p.organization_id = target_organization)
     and (
          lower(btrim(coalesce(p.email, ''))) = caller_email
       or lower(btrim(coalesce(p.booking_email, ''))) = caller_email
     );

  if match_count <> 1 then
    return 0;
  end if;

  update public.client_profiles p
     set auth_user_id = auth.uid()
   where p.auth_user_id is null
     and coalesce(p.status, 'active') <> 'archived'
     and (target_organization is null or p.organization_id = target_organization)
     and (
          lower(btrim(coalesce(p.email, ''))) = caller_email
       or lower(btrim(coalesce(p.booking_email, ''))) = caller_email
     );

  get diagnostics match_count = row_count;
  return match_count;
end;
$function$
