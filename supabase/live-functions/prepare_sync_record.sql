CREATE OR REPLACE FUNCTION public.prepare_sync_record()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  profile_org uuid;
begin
  if new.client_id is not null then
    select organization_id into profile_org
    from public.client_profiles
    where id = new.client_id;

    if profile_org is null or profile_org <> new.organization_id then
      raise exception 'The client and record must belong to the same organization.';
    end if;
  end if;

  new.updated_at := now();
  new.updated_by := auth.uid();

  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := auth.uid();
    new.version := 1;
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.version := old.version + 1;
  end if;

  return new;
end;
$function$
