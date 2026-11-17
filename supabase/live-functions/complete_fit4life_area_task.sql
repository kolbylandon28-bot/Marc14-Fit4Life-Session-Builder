CREATE OR REPLACE FUNCTION public.complete_fit4life_area_task(task uuid, on_day date DEFAULT NULL::date, done boolean DEFAULT true, done_note text DEFAULT NULL::text, org_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  org uuid := public.fit4life_active_org(org_id);
  task_area text;
  day date := coalesce(on_day, current_date);
begin
  select t.area_key into task_area from public.area_tasks t
   where t.id = task and t.organization_id = org and t.is_active;
  if task_area is null then
    raise exception 'That task is not on this list';
  end if;
  if not public.fit4life_works_in_area(task_area, org) then
    raise exception 'You do not work in that area';
  end if;
  if done then
    insert into public.area_task_done (organization_id, task_id, done_on, done_by, note)
    values (org, task, day, auth.uid(), nullif(btrim(coalesce(done_note, '')), ''))
    on conflict (task_id, done_on) do update
       set done_by = auth.uid(), done_at = now(), note = nullif(btrim(coalesce(done_note, '')), '');
  else
    delete from public.area_task_done d where d.task_id = task and d.done_on = day and d.organization_id = org;
  end if;
  return true;
end;
$function$
