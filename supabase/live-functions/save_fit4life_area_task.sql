CREATE OR REPLACE FUNCTION public.save_fit4life_area_task(area text, task_title text, task_detail text DEFAULT NULL::text, task_repeats text DEFAULT 'once'::text, task_due date DEFAULT NULL::date, task_assigned uuid DEFAULT NULL::uuid, task_assigned_name text DEFAULT NULL::text, task_sort integer DEFAULT 0, task_id uuid DEFAULT NULL::uuid, org_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  org uuid := public.fit4life_active_org(org_id);
  saved uuid;
  clean_repeats text := lower(btrim(coalesce(task_repeats, 'once')));
begin
  if not public.is_org_owner(org) then
    raise exception 'Only an owner can change the task list';
  end if;
  if btrim(coalesce(task_title, '')) = '' then
    raise exception 'A task needs a name';
  end if;
  if clean_repeats not in ('once', 'daily', 'weekly') then
    clean_repeats := 'once';
  end if;
  if task_id is null then
    insert into public.area_tasks (organization_id, area_key, title, detail, repeats, due_on, assigned_to, assigned_name, sort_order, created_by)
    values (org, area, btrim(task_title), nullif(btrim(coalesce(task_detail, '')), ''), clean_repeats, task_due, task_assigned,
            nullif(btrim(coalesce(task_assigned_name, '')), ''), coalesce(task_sort, 0), auth.uid())
    returning id into saved;
  else
    update public.area_tasks
       set area_key = area, title = btrim(task_title), detail = nullif(btrim(coalesce(task_detail, '')), ''),
           repeats = clean_repeats, due_on = task_due, assigned_to = task_assigned,
           assigned_name = nullif(btrim(coalesce(task_assigned_name, '')), ''), sort_order = coalesce(task_sort, 0)
     where id = task_id and organization_id = org
     returning id into saved;
  end if;
  return saved;
end;
$function$
