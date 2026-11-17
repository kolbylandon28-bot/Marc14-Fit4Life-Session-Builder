CREATE OR REPLACE FUNCTION public.fit4life_module_preset(kind text)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case coalesce(kind, 'gym')
    when 'university' then '{"facility":true,"timeclock":true,"volunteers":true,"audits":true,"booking_import":true,"consultation":true,"staff":true}'::jsonb
    when 'gym'        then '{"facility":true,"timeclock":true,"volunteers":false,"audits":true,"booking_import":false,"consultation":true,"staff":true}'::jsonb
    when 'employer'   then '{"facility":false,"timeclock":false,"volunteers":false,"audits":false,"booking_import":false,"consultation":true,"staff":false}'::jsonb
    when 'individual' then '{"facility":false,"timeclock":false,"volunteers":false,"audits":false,"booking_import":false,"consultation":true,"staff":false}'::jsonb
    else '{"facility":true,"timeclock":true,"volunteers":false,"audits":true,"booking_import":false,"consultation":true,"staff":true}'::jsonb
  end;
$function$
