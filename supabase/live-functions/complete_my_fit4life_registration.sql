CREATE OR REPLACE FUNCTION public.complete_my_fit4life_registration()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then
    return false;
  end if;

  update public.registration_requests as request
  set status = 'approved',
      reviewed_at = coalesce(request.reviewed_at, now()),
      review_note = coalesce(request.review_note, 'Connected to an existing trainer-created profile'),
      updated_at = now()
  where request.user_id = auth.uid()
    and request.requested_role = 'client'
    and request.status = 'pending'
    and exists (
      select 1
      from public.client_profiles as client
      join public.memberships as membership
        on membership.organization_id = client.organization_id
       and membership.user_id = auth.uid()
       and membership.role = 'client'
       and membership.is_active
      where client.auth_user_id = auth.uid()
        and client.organization_id = request.organization_id
        and client.status = 'active'
    );

  return found;
end;
$function$
