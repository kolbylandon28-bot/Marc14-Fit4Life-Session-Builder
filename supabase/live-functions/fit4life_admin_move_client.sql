CREATE OR REPLACE FUNCTION public.fit4life_admin_move_client(target_user uuid, from_org uuid, to_org uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  source_member public.memberships%rowtype;
  target_member public.memberships%rowtype;
  source_profile public.client_profiles%rowtype;
  target_is_template boolean;
  records_moved integer := 0;
  -- database role in the editor, no jwt
  db_admin boolean := exists (
    select 1 from pg_catalog.pg_roles r
    where r.rolname = session_user
      and (r.rolsuper or r.rolbypassrls or r.rolname = 'postgres')
  );
begin
  if not (public.is_platform_admin() or db_admin) then
    raise exception 'only a platform admin can move a client' using errcode = '42501';
  end if;

  if target_user is null or from_org is null or to_org is null then
    raise exception 'a login, a source organization and a target organization are required' using errcode = '22023';
  end if;

  if from_org = to_org then
    raise exception 'the source and the target organization are the same' using errcode = '22023';
  end if;

  select coalesce(o.is_template, false) into target_is_template
  from public.organizations o
  where o.id = to_org;

  if target_is_template is null then
    raise exception 'organization % was not found', to_org using errcode = '22023';
  end if;

  if target_is_template then
    raise exception 'the skeleton branch holds no client data' using errcode = '42501';
  end if;

  select * into source_member
  from public.memberships m
  where m.organization_id = from_org
    and m.user_id = target_user
  for update;

  if source_member.id is null then
    raise exception 'no membership in the source organization' using errcode = '22023';
  end if;

  if source_member.role <> 'client' then
    raise exception 'only a client membership can be moved' using errcode = '42501';
  end if;

  select * into target_member
  from public.memberships m
  where m.organization_id = to_org
    and m.user_id = target_user
  for update;

  -- no demoting a seat that is already staff over there
  if target_member.id is not null and target_member.role <> 'client' then
    raise exception 'that login already holds a % seat in the target organization', target_member.role
      using errcode = '42501';
  end if;

  select * into source_profile
  from public.client_profiles p
  where p.organization_id = from_org
    and p.auth_user_id = target_user
  for update;

  if source_profile.id is not null then
    if exists (
      select 1 from public.client_profiles p
      where p.organization_id = to_org
        and p.auth_user_id = target_user
    ) then
      raise exception 'that login already has a client profile in the target organization'
        using errcode = '23505';
    end if;

    if source_profile.email is not null and exists (
      select 1 from public.client_profiles p
      where p.organization_id = to_org
        and p.email = source_profile.email
    ) then
      raise exception 'a client profile with that email already exists in the target organization'
        using errcode = '23505';
    end if;

    if exists (
      select 1 from public.client_profiles p
      where p.organization_id = to_org
        and p.username = source_profile.username
    ) then
      raise exception 'a client profile with that username already exists in the target organization'
        using errcode = '23505';
    end if;

    if exists (
      select 1 from public.client_profiles p
      where p.organization_id = to_org
        and p.external_id = source_profile.external_id
    ) then
      raise exception 'a client profile with that external id already exists in the target organization'
        using errcode = '23505';
    end if;
  end if;

  perform set_config(
    'fit4life.membership_reason',
    'Platform admin moved a client to another branch',
    true
  );

  if target_member.id is not null then
    update public.memberships
    set role = 'client',
        is_active = source_member.is_active,
        trainer_tier = source_member.trainer_tier,
        updated_at = now()
    where organization_id = to_org
      and user_id = target_user;
  else
    insert into public.memberships (organization_id, user_id, role, is_active, trainer_tier)
    values (to_org, target_user, 'client', source_member.is_active, source_member.trainer_tier);
  end if;

  delete from public.memberships where id = source_member.id;

  if source_profile.id is not null then
    update public.client_profiles
    set organization_id = to_org,
        updated_at = now()
    where id = source_profile.id;

    -- sync rows after the client, a mismatch rejected by prepare_sync_record
    update public.sync_records
    set organization_id = to_org
    where client_id = source_profile.id
      and organization_id = from_org;
    get diagnostics records_moved = row_count;
  end if;

  perform set_config('fit4life.membership_reason', '', true);

  return 'Moved. Profiles re-pointed: '
      || (case when source_profile.id is null then 0 else 1 end)::text
      || '. Sync records moved: ' || records_moved::text
      || '. Signup request rows were left where they are.';
end;
$function$
