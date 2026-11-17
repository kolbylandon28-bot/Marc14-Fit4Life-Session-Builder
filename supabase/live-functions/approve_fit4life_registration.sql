CREATE OR REPLACE FUNCTION public.approve_fit4life_registration(target_request uuid, org_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  caller_organization uuid;
  request_row public.registration_requests%rowtype;
  client_row public.client_profiles%rowtype;
  selected_username citext;
begin
  select * into request_row
  from public.registration_requests
  where id = target_request
  for update;

  if request_row.id is null then
    raise exception 'Registration request was not found.';
  end if;

  if request_row.requested_role <> 'client' then
    raise exception 'Trainer requests must be reviewed in the owner-only Trainer Access center.';
  end if;

  -- branch the caller is standing in
  caller_organization := public.fit4life_active_org(org_id);

  -- no cross-branch approvals
  if caller_organization is distinct from request_row.organization_id then
    raise exception 'registration belongs to another organization'
      using errcode = '42501';
  end if;

  if not public.is_org_trainer(caller_organization) then
    raise exception 'Trainer access is required.';
  end if;

  if request_row.status <> 'pending' then
    raise exception 'This registration request has already been reviewed.';
  end if;

  if not exists (
    select 1 from auth.users
    where id = request_row.user_id
      and email_confirmed_at is not null
  ) then
    raise exception 'The client must verify their email before approval.';
  end if;

  -- the request's own login first, then the address; never the oldest
  select * into client_row
  from public.client_profiles
  where organization_id = request_row.organization_id
    and (auth_user_id = request_row.user_id or email = request_row.email)
  order by (auth_user_id is not distinct from request_row.user_id) desc
  limit 1
  for update;

  if client_row.id is not null then
    if client_row.auth_user_id is not null and client_row.auth_user_id <> request_row.user_id then
      raise exception 'That client profile is already connected to another account.';
    end if;

    if client_row.status = 'archived' then
      raise exception 'That client profile is archived. An owner must restore it before this request can be approved.'
        using errcode = '42501';
    end if;

    -- status guard exemption, transaction local, only when it really changes
    if client_row.status <> 'active' then
      perform set_config('fit4life.client_admission', '1', true);
    end if;

    update public.client_profiles
    set auth_user_id = request_row.user_id,
        email = request_row.email,
        status = 'active',
        updated_at = now()
    where id = client_row.id
    returning * into client_row;

    perform set_config('fit4life.client_admission', '', true);
  else
    selected_username := request_row.username;
    if exists (
      select 1 from public.client_profiles
      where organization_id = request_row.organization_id
        and username = selected_username
    ) then
      selected_username := (request_row.username::text || '-' || left(request_row.user_id::text, 6))::citext;
    end if;

    insert into public.client_profiles (
      organization_id,
      external_id,
      auth_user_id,
      full_name,
      username,
      email,
      status,
      created_by
    )
    values (
      request_row.organization_id,
      request_row.user_id::text,
      request_row.user_id,
      request_row.full_name,
      selected_username,
      request_row.email,
      'active',
      auth.uid()
    )
    returning * into client_row;
  end if;

  insert into public.memberships (organization_id, user_id, role, is_active)
  values (request_row.organization_id, request_row.user_id, 'client', true)
  on conflict (organization_id, user_id)
  do update set
    role = 'client',
    is_active = true,
    updated_at = now();

  update public.registration_requests
  set status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = 'Approved by trainer',
      updated_at = now()
  where id = request_row.id;

  return client_row.id;
end;
$function$
