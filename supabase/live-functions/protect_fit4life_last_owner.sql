CREATE OR REPLACE FUNCTION public.protect_fit4life_last_owner()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  remaining integer;
begin
  if tg_op = 'DELETE' and old.role = 'owner' and old.is_active then
    select count(*) into remaining
    from public.memberships membership
    where membership.organization_id = old.organization_id
      and membership.role = 'owner'
      and membership.is_active
      and membership.id <> old.id;
    if remaining < 1 then
      raise exception 'Every gym must keep at least one active owner. Promote another owner first.';
    end if;
  elsif tg_op = 'UPDATE' and old.role = 'owner' and old.is_active
        and (new.role <> 'owner' or not new.is_active) then
    select count(*) into remaining
    from public.memberships membership
    where membership.organization_id = old.organization_id
      and membership.role = 'owner'
      and membership.is_active
      and membership.id <> old.id;
    if remaining < 1 then
      raise exception 'Every gym must keep at least one active owner. Promote another owner first.';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$
