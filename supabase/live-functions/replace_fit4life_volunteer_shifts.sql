CREATE OR REPLACE FUNCTION public.replace_fit4life_volunteer_shifts(target_organization uuid, rows_json jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  written int := 0;
begin
  -- service key, or branch owner
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_org_owner(target_organization) then
    raise exception 'not allowed to replace volunteer shifts for this organization'
      using errcode = '42501';
  end if;

  delete from public.volunteer_shifts where organization_id = target_organization;
  insert into public.volunteer_shifts (organization_id, area_key, shift_date, starts_at, ends_at, names, open_spots)
  select target_organization,
         coalesce(nullif(btrim(row_data->>'area'), ''), 'gym'),
         (row_data->>'date')::date,
         (row_data->>'starts_at')::timestamptz,
         (row_data->>'ends_at')::timestamptz,
         coalesce(array(select jsonb_array_elements_text(row_data->'names')), '{}'),
         coalesce((row_data->>'open_spots')::int, 0)
    from jsonb_array_elements(rows_json) as row_data
   where row_data->>'date' is not null and row_data->>'starts_at' is not null;
  get diagnostics written = row_count;

  insert into public.volunteer_sync_state (organization_id, last_synced_at, last_rows, last_error)
  values (target_organization, now(), written, null)
  on conflict (organization_id) do update
     set last_synced_at = now(), last_rows = written, last_error = null;
  return written;
end;
$function$
