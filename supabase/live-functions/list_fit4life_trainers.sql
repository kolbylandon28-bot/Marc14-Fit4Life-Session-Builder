CREATE OR REPLACE FUNCTION public.list_fit4life_trainers(org_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(user_id uuid, display_name text, email text, role text, is_active boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  caller_organization uuid;
begin
  caller_organization := public.fit4life_active_org(org_id);

  if caller_organization is null then
    raise exception 'Trainer access is required.';
  end if;

  -- role check scoped to the resolved org
  if not public.is_org_trainer(caller_organization) then
    raise exception 'Trainer access is required.';
  end if;

  return query
  select
    membership.user_id,
    coalesce(staff.display_name, nullif(auth_user.raw_user_meta_data ->> 'display_name', ''), split_part(auth_user.email, '@', 1))::text,
    auth_user.email::text,
    membership.role,
    membership.is_active
  from public.memberships membership
  join auth.users auth_user on auth_user.id = membership.user_id
  left join public.staff_profiles staff
    on staff.organization_id = membership.organization_id
   and staff.user_id = membership.user_id
  where membership.organization_id = caller_organization
    and membership.role in ('owner', 'trainer')
  order by membership.role = 'owner' desc, coalesce(staff.display_name, auth_user.email);
end;
$function$
