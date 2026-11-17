CREATE OR REPLACE FUNCTION public.claim_my_fit4life_staff_invite()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  my_email text;
  invite public.staff_invites%rowtype;
begin
  select lower(u.email) into my_email
    from auth.users u
   where u.id = auth.uid()
     and coalesce(u.email_confirmed_at, u.confirmed_at) is not null;
  if my_email is null then
    return false;
  end if;

  select * into invite
    from public.staff_invites i
   where lower(i.email) = my_email
     and i.revoked_at is null
     and i.accepted_at is null
   order by i.created_at desc
   limit 1;

  if invite.id is null then
    return false;
  end if;

  insert into public.memberships (organization_id, user_id, role, is_active)
  values (invite.organization_id, auth.uid(), invite.role, true)
  on conflict do nothing;

  delete from public.staff_areas where organization_id = invite.organization_id and user_id = auth.uid();
  insert into public.staff_areas (organization_id, user_id, area_key)
  select invite.organization_id, auth.uid(), unnest(coalesce(invite.areas, '{}'))
  on conflict do nothing;

  update public.staff_invites
     set accepted_at = now(), accepted_by = auth.uid()
   where id = invite.id;

  return true;
end;
$function$
