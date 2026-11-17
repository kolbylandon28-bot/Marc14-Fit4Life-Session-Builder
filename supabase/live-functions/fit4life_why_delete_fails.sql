CREATE OR REPLACE FUNCTION public.fit4life_why_delete_fails(check_email text)
 RETURNS SETOF text
 LANGUAGE plpgsql
AS $function$
declare
  uid uuid;
  msg text;
  det text;
  r   record;
  n   int := 0;
begin
  select id into uid
    from auth.users
   where lower(btrim(email)) = lower(btrim(check_email));

  if uid is null then
    return next 'No account with that address.';
    return;
  end if;

  begin
    delete from auth.users where id = uid;
    raise exception 'F4L_ROLLBACK';
  exception
    when others then
      get stacked diagnostics msg = message_text, det = pg_exception_detail;
      if msg = 'F4L_ROLLBACK' then
        return next 'DRY RUN OK - the delete works. Nothing blocks it.';
      else
        return next 'BLOCKED BY: ' || msg;
        if det is not null and det <> '' then
          return next 'DETAIL: ' || det;
        end if;
      end if;
  end;

  return next '--- foreign keys still set to block, any schema ---';
  for r in
    select n2.nspname || '.' || t.relname || '.' || a.attname as col,
           c.conname
      from pg_constraint c
      join pg_class t      on t.oid = c.conrelid
      join pg_namespace n2 on n2.oid = t.relnamespace
      join pg_attribute a  on a.attrelid = c.conrelid
                          and a.attnum = c.conkey[1]
     where c.contype = 'f'
       and c.confrelid = 'auth.users'::regclass
       and c.confdeltype in ('a', 'r')
  loop
    n := n + 1;
    return next r.col || '   (' || r.conname || ')';
  end loop;
  if n = 0 then
    return next 'none';
  end if;

  n := 0;
  return next '--- triggers on auth.users ---';
  for r in
    select tg.tgname, p.proname
      from pg_trigger tg
      join pg_proc p on p.oid = tg.tgfoid
     where tg.tgrelid = 'auth.users'::regclass
       and not tg.tgisinternal
  loop
    n := n + 1;
    return next r.tgname || '  ->  ' || r.proname || '()';
  end loop;
  if n = 0 then
    return next 'none';
  end if;
end;
$function$
