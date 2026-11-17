CREATE OR REPLACE FUNCTION public.activate_my_fit4life_client_account()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  current_auth_user auth.users%rowtype;
  request_row public.registration_requests%rowtype;
  client_row public.client_profiles%rowtype;
  selected_username citext;
  pending_branches integer;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  select * into current_auth_user
  from auth.users
  where id = auth.uid();

  if current_auth_user.email_confirmed_at is null then
    raise exception 'Verify the email sent to your address before opening the client workspace.';
  end if;

  select count(distinct request.organization_id) into pending_branches
  from public.registration_requests request
  where request.user_id = auth.uid()
    and request.requested_role = 'client'
    and request.status = 'pending';

  -- refuse to guess
  if pending_branches > 1 then
    raise exception 'registration is ambiguous: % branches hold a pending request for this login, a trainer must approve the right one', pending_branches
      using errcode = '22023';
  end if;

  -- one branch past the guard, and one row per login per branch
  select * into request_row
  from public.registration_requests request
  where request.user_id = auth.uid()
    and request.requested_role = 'client'
    and request.status = 'pending'
  for update;

  if request_row.id is null then
    raise exception 'No pending client registration matches this verified login.';
  end if;

  -- staff guard scoped to the request's branch, not every branch
  if exists (
    select 1 from public.memberships membership
    where membership.organization_id = request_row.organization_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'trainer')
      and membership.is_active
  ) then
    raise exception 'Trainer accounts use their approved trainer membership.';
  end if;

  -- this login's own row first, then the address; never the oldest
  select * into client_row
  from public.client_profiles profile
  where profile.organization_id = request_row.organization_id
    and (profile.auth_user_id = auth.uid() or lower(profile.email::text) = lower(request_row.email::text))
  order by (profile.auth_user_id is not distinct from auth.uid()) desc
  limit 1
  for update;

  if client_row.id is not null then
    if client_row.auth_user_id is not null and client_row.auth_user_id <> auth.uid() then
      raise exception 'That client email is already connected to another login. Ask a trainer to review it.';
    end if;

    if client_row.status = 'archived' then
      raise exception 'That client profile is archived. Ask an owner to restore it before signing in.'
        using errcode = '42501';
    end if;

    -- status guard exemption, transaction local, only when it really changes
    if client_row.status <> 'active' then
      perform set_config('fit4life.client_admission', '1', true);
    end if;

    update public.client_profiles
    set auth_user_id = auth.uid(),
        email = request_row.email,
        full_name = request_row.full_name,
        status = 'active',
        updated_at = now()
    where id = client_row.id
    returning * into client_row;

    perform set_config('fit4life.client_admission', '', true);
  else
    selected_username := request_row.username;
    if exists (
      select 1 from public.client_profiles profile
      where profile.organization_id = request_row.organization_id
        and profile.username = selected_username
    ) then
      selected_username := (request_row.username::text || '-' || left(auth.uid()::text, 6))::citext;
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
    ) values (
      request_row.organization_id,
      auth.uid()::text,
      auth.uid(),
      request_row.full_name,
      selected_username,
      request_row.email,
      'active',
      auth.uid()
    )
    returning * into client_row;
  end if;

  insert into public.memberships (organization_id, user_id, role, is_active)
  values (request_row.organization_id, auth.uid(), 'client', true)
  on conflict (organization_id, user_id)
  do update set role = 'client', is_active = true, updated_at = now();

  update public.registration_requests
  set status = 'approved',
      reviewed_by = null,
      reviewed_at = now(),
      review_note = 'Email verified; client workspace activated automatically',
      updated_at = now()
  where id = request_row.id;

  return client_row.id;
end;
$function$
