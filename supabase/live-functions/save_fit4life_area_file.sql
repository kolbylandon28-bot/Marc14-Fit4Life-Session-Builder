CREATE OR REPLACE FUNCTION public.save_fit4life_area_file(area text, file_title text, file_category text DEFAULT 'General'::text, file_body text DEFAULT NULL::text, file_link text DEFAULT NULL::text, file_link_label text DEFAULT NULL::text, file_sort integer DEFAULT 0, file_id uuid DEFAULT NULL::uuid, org_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  org uuid := public.fit4life_active_org(org_id);
  saved uuid;
  clean_category text := nullif(btrim(coalesce(file_category, '')), '');
  clean_link text := nullif(btrim(coalesce(file_link, '')), '');
begin
  if not public.is_org_owner(org) then
    raise exception 'Only an owner can change the files';
  end if;
  if btrim(coalesce(file_title, '')) = '' then
    raise exception 'A file needs a title';
  end if;
  if clean_link is not null and clean_link !~* '^https?://' then
    raise exception 'A link has to start with http:// or https://';
  end if;
  if clean_category is null then
    clean_category := 'General';
  end if;
  if file_id is null then
    insert into public.area_files (organization_id, area_key, category, title, body, link_url, link_label, sort_order, created_by)
    values (org, area, clean_category, btrim(file_title), nullif(btrim(coalesce(file_body, '')), ''), clean_link,
            nullif(btrim(coalesce(file_link_label, '')), ''), coalesce(file_sort, 0), auth.uid())
    returning id into saved;
  else
    update public.area_files f
       set area_key = area, category = clean_category, title = btrim(file_title),
           body = nullif(btrim(coalesce(file_body, '')), ''), link_url = clean_link,
           link_label = nullif(btrim(coalesce(file_link_label, '')), ''),
           sort_order = coalesce(file_sort, 0), updated_at = now()
     where f.id = file_id and f.organization_id = org
     returning f.id into saved;
  end if;
  return saved;
end;
$function$
