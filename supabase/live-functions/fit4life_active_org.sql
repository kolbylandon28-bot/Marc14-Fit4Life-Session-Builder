CREATE OR REPLACE FUNCTION public.fit4life_active_org(requested uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  found uuid;
  n integer;
begin
  if requested is not null then
    select m.organization_id into found
      from public.memberships m
     where m.user_id = auth.uid()
       and m.is_active
       and m.organization_id = requested
     limit 1;
    if found is null then
      raise exception 'not an active member of organization %', requested
        using errcode = '42501';
    end if;
    return found;
  end if;

  select count(*) into n
    from public.memberships m
   where m.user_id = auth.uid() and m.is_active;

  if n = 0 then
    return null;
  end if;

  -- refuse to guess
  if n > 1 then
    raise exception 'organization is ambiguous: % active memberships, pass org_id', n
      using errcode = '22023';
  end if;

  select m.organization_id into found
    from public.memberships m
   where m.user_id = auth.uid() and m.is_active;
  return found;
end;
$function$
