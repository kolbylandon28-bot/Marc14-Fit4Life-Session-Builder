CREATE OR REPLACE FUNCTION public.fit4life_reject_template_rows()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  template boolean;
begin
  select coalesce(o.is_template, false) into template
    from public.organizations o
   where o.id = new.organization_id;

  if template then
    -- staff ok, client not
    if tg_table_name = 'memberships' and new.role <> 'client' then
      return new;
    end if;
    raise exception 'the skeleton branch holds no client data'
      using errcode = '42501';
  end if;
  return new;
end;
$function$
