CREATE OR REPLACE FUNCTION public.fit4life_fix_account_deletes()
 RETURNS SETOF text
 LANGUAGE plpgsql
AS $function$
declare
  r      record;
  action text;
begin
  for r in
    select c.conname,
           c.conrelid::regclass::text  as tbl,
           c.confrelid::regclass::text as reftbl,
           a.attname                   as col,
           ra.attname                  as refcol,
           a.attnotnull                as required
      from pg_constraint c
      join pg_class t      on t.oid = c.conrelid
      join pg_namespace n  on n.oid = t.relnamespace
      join pg_attribute a  on a.attrelid = c.conrelid
                          and a.attnum = c.conkey[1]
      join pg_attribute ra on ra.attrelid = c.confrelid
                          and ra.attnum = c.confkey[1]
     where c.contype = 'f'
       and c.confrelid = 'auth.users'::regclass
       and array_length(c.conkey, 1) = 1
       and n.nspname = 'public'
       and c.confdeltype in ('a', 'r')
  loop
    action := case when r.required then 'cascade' else 'set null' end;

    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
    execute format(
      'alter table %s add constraint %I foreign key (%I) references %s(%I) on delete %s',
      r.tbl, r.conname, r.col, r.reftbl, r.refcol, action);

    return next r.tbl || '.' || r.col || '  ->  on delete ' || action;
  end loop;

  return next 'Done. Deleting a user in Authentication now works.';
end;
$function$
