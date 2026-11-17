CREATE OR REPLACE FUNCTION public.list_fit4life_membership_audit(org_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, target_user_id uuid, target_email text, target_display_name text, action text, previous_role text, new_role text, previous_active boolean, new_active boolean, changed_by uuid, changed_by_name text, change_reason text, changed_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  owner_organization uuid;
begin
  owner_organization := public.fit4life_active_org(org_id);

  if owner_organization is null then
    raise exception 'Only an active gym owner can view membership history.';
  end if;

  -- owner of THIS org, not owner somewhere
  if not public.is_org_owner(owner_organization) then
    raise exception 'Only an active gym owner can view membership history.';
  end if;

  return query
  select
    audit.id,
    audit.target_user_id,
    target_auth.email::text,
    coalesce(target_staff.display_name, split_part(target_auth.email, '@', 1))::text,
    audit.action,
    audit.previous_role,
    audit.new_role,
    audit.previous_active,
    audit.new_active,
    audit.changed_by,
    coalesce(changer_staff.display_name, changer_auth.email, 'System')::text,
    audit.change_reason,
    audit.changed_at
  from public.membership_audit_log audit
  join auth.users target_auth on target_auth.id = audit.target_user_id
  left join public.staff_profiles target_staff
    on target_staff.organization_id = audit.organization_id
   and target_staff.user_id = audit.target_user_id
  left join auth.users changer_auth on changer_auth.id = audit.changed_by
  left join public.staff_profiles changer_staff
    on changer_staff.organization_id = audit.organization_id
   and changer_staff.user_id = audit.changed_by
  where audit.organization_id = owner_organization
  order by audit.changed_at desc
  limit 100;
end;
$function$
