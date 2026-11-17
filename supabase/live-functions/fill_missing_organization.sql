CREATE OR REPLACE FUNCTION public.fill_missing_organization()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare only_gym uuid; how_many int;
begin
  if new.organization_id is not null then
    return new;
  end if;
  select count(*) into how_many from public.organizations;
  if how_many <> 1 then
    raise exception
      'organization_id is required on % once more than one gym exists (found %).',
      tg_table_name, how_many;
  end if;
  select id into only_gym from public.organizations limit 1;
  new.organization_id := only_gym;
  return new;
end $function$
