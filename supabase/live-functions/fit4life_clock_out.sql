CREATE OR REPLACE FUNCTION public.fit4life_clock_out(device text, entry_note text DEFAULT NULL::text, org_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  org uuid := public.fit4life_active_org(org_id);
  entry public.time_entries%rowtype;
begin
  update public.time_entries
     set clock_out = now(), note = coalesce(nullif(btrim(coalesce(entry_note, '')), ''), note)
   where organization_id = org and user_id = auth.uid() and clock_out is null
   returning * into entry;
  if entry.id is null then
    return jsonb_build_object('ok', false, 'error', 'You were not clocked in');
  end if;
  return jsonb_build_object('ok', true, 'id', entry.id, 'clock_out', entry.clock_out);
end;
$function$
