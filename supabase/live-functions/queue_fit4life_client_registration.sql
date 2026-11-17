CREATE OR REPLACE FUNCTION public.queue_fit4life_client_registration()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  target_organization uuid;
  requested_name text;
  requested_username text;
  requested_slug text;
begin
  if coalesce(new.raw_user_meta_data ->> 'registration_source', '') <> 'fit4life_web' then
    return new;
  end if;

  if coalesce(new.raw_user_meta_data ->> 'requested_role', '') <> 'client' then
    return new;
  end if;

  requested_slug := coalesce(nullif(trim(new.raw_user_meta_data ->> 'organization_slug'), ''), 'fit-4-life');

  select id into target_organization
  from public.organizations
  where slug = requested_slug::citext
  limit 1;

  if target_organization is null or new.email is null then
    return new;
  end if;

  requested_name := trim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  if char_length(requested_name) < 2 then
    requested_name := split_part(new.email, '@', 1);
  end if;

  requested_username := lower(regexp_replace(
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'username'), ''), requested_name),
    '[^a-zA-Z0-9._-]+', '-', 'g'
  ));
  requested_username := trim(both '-' from requested_username);
  if requested_username = '' then
    requested_username := 'client-' || left(new.id::text, 8);
  end if;

  insert into public.registration_requests (
    organization_id, user_id, email, full_name, username, requested_role, status
  )
  values (
    target_organization, new.id, lower(new.email)::citext,
    requested_name, requested_username::citext, 'client', 'pending'
  )
  on conflict (organization_id, email)
  do update set
    user_id = excluded.user_id,
    full_name = excluded.full_name,
    username = excluded.username,
    requested_role = 'client',
    status = case
      when public.registration_requests.status = 'approved' then 'approved'
      else 'pending'
    end,
    reviewed_by = case
      when public.registration_requests.status = 'approved' then public.registration_requests.reviewed_by
      else null
    end,
    reviewed_at = case
      when public.registration_requests.status = 'approved' then public.registration_requests.reviewed_at
      else null
    end,
    review_note = case
      when public.registration_requests.status = 'approved' then public.registration_requests.review_note
      else null
    end,
    updated_at = now();

  return new;
end;
$function$
