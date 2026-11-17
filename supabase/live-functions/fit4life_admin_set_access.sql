CREATE OR REPLACE FUNCTION public.fit4life_admin_set_access(target_user uuid, target_org uuid, new_role text, new_active boolean)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  clean_role text := lower(btrim(coalesce(new_role, '')));
  wanted_active boolean := new_active;
  existing public.memberships%rowtype;
  reason text;
  -- database role in the editor, no jwt
  db_admin boolean := exists (
    select 1 from pg_catalog.pg_roles r
    where r.rolname = session_user
      and (r.rolsuper or r.rolbypassrls or r.rolname = 'postgres')
  );
begin
  if not (public.is_platform_admin() or db_admin) then
    raise exception 'only a platform admin can set a membership' using errcode = '42501';
  end if;

  if target_user is null or target_org is null or wanted_active is null then
    raise exception 'a login, an organization and an active flag are required' using errcode = '22023';
  end if;

  if clean_role not in ('owner', 'trainer', 'client', 'staff') then
    raise exception 'role must be owner, trainer, client or staff' using errcode = '22023';
  end if;

  if not exists (select 1 from public.organizations o where o.id = target_org) then
    raise exception 'organization % was not found', target_org using errcode = '22023';
  end if;

  if not exists (select 1 from auth.users u where u.id = target_user) then
    raise exception 'no login with that id' using errcode = '22023';
  end if;

  reason := 'Platform admin set role ' || clean_role || ', active ' || wanted_active::text;

  select * into existing
  from public.memberships m
  where m.organization_id = target_org
    and m.user_id = target_user
  for update;

  -- audit reason for the memberships trigger
  perform set_config('fit4life.membership_reason', left(reason, 500), true);

  if existing.id is null then
    insert into public.memberships (organization_id, user_id, role, is_active)
    values (target_org, target_user, clean_role, wanted_active);
  else
    update public.memberships
    set role = clean_role,
        is_active = wanted_active,
        updated_at = now()
    where id = existing.id;

    -- no real change, so no trigger row; log the confirm here
    if existing.role = clean_role and existing.is_active = wanted_active then
      insert into public.membership_audit_log (
        organization_id, target_user_id, action, previous_role, new_role,
        previous_active, new_active, changed_by, change_reason
      ) values (
        target_org, target_user, 'membership_confirmed', existing.role, clean_role,
        existing.is_active, wanted_active, auth.uid(), reason
      );
    end if;
  end if;

  perform set_config('fit4life.membership_reason', '', true);

  return reason;
end;
$function$
