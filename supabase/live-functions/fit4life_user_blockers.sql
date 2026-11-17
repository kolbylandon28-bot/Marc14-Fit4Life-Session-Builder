CREATE OR REPLACE FUNCTION public.fit4life_user_blockers(check_email text)
 RETURNS TABLE(referencing text, rows_found bigint)
 LANGUAGE plpgsql
AS $function$
declare
  uid uuid;
  r   record;
  n   bigint;
begin
  select id into uid
    from auth.users
   where lower(btrim(email)) = lower(btrim(check_email));

  if uid is null then
    referencing := 'no account with that address';
    rows_found := 0;
    return next;
    return;
  end if;

  for r in
    select c.conrelid::regclass::text as tbl,
           a.attname::text            as col,
           c.confdeltype              as del
      from pg_constraint c
      join unnest(c.conkey) with ordinality k(attnum, ord) on true
      join pg_attribute a
        on a.attrelid = c.conrelid
       and a.attnum = k.attnum
     where c.contype = 'f'
       and c.confrelid = 'auth.users'::regclass
  loop
    execute format('select count(*) from %s where %I = $1', r.tbl, r.col)
       into n using uid;

    if n > 0 then
      referencing := r.tbl || '.' || r.col || '  ->  ' ||
        case r.del
          when 'a' then 'NO ACTION - THIS BLOCKS THE DELETE'
          when 'r' then 'RESTRICT - THIS BLOCKS THE DELETE'
          when 'c' then 'cascade, deletes itself'
          when 'n' then 'set null, clears itself'
          when 'd' then 'set default'
          else r.del::text
        end;
      rows_found := n;
      return next;
    end if;
  end loop;
end;
$function$
