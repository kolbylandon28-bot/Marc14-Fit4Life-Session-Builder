CREATE OR REPLACE FUNCTION public.fit4life_admin_find_user(check_email text)
 RETURNS TABLE(record_kind text, organization_id uuid, org_slug text, role text, is_active boolean, full_name text, status text, has_login boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  wanted text := lower(btrim(coalesce(check_email, '')));
  target_login uuid;
  -- database role in the editor, no jwt
  db_admin boolean := exists (
    select 1 from pg_catalog.pg_roles r
    where r.rolname = session_user
      and (r.rolsuper or r.rolbypassrls or r.rolname = 'postgres')
  );
begin
  if not (public.is_platform_admin() or db_admin) then
    raise exception 'only a platform admin can look up an account' using errcode = '42501';
  end if;

  if wanted = '' then
    raise exception 'an email address is required' using errcode = '22023';
  end if;

  select u.id into target_login
  from auth.users u
  where lower(btrim(u.email)) = wanted
  limit 1;

  return query
  select 'membership'::text,
         m.organization_id,
         o.slug::text,
         m.role,
         m.is_active,
         null::text,
         null::text,
         null::boolean
    from public.memberships m
    join public.organizations o on o.id = m.organization_id
   where target_login is not null
     and m.user_id = target_login
  union all
  select 'client_profile'::text,
         p.organization_id,
         o.slug::text,
         null::text,
         null::boolean,
         p.full_name,
         p.status,
         (p.auth_user_id is not null)
    from public.client_profiles p
    join public.organizations o on o.id = p.organization_id
   where (target_login is not null and p.auth_user_id = target_login)
      or lower(p.email::text) = wanted
      or lower(btrim(coalesce(p.booking_email, ''))) = wanted
  union all
  select 'registration_request'::text,
         r.organization_id,
         o.slug::text,
         r.requested_role,
         null::boolean,
         r.full_name,
         r.status,
         null::boolean
    from public.registration_requests r
    join public.organizations o on o.id = r.organization_id
   where (target_login is not null and r.user_id = target_login)
      or lower(r.email::text) = wanted
  order by 1, 3;
end;
$function$
