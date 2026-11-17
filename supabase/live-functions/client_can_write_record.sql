CREATE OR REPLACE FUNCTION public.client_can_write_record(target_client uuid, target_record_type text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.client_profiles c
    where c.id = target_client
      and c.auth_user_id = auth.uid()
      and target_record_type in (
        'client_activity',
        'active_workout',
        'check_in',
        'exercise_preference',
        'habit_log',
        'message',
        'nutrition_log',
        'pain_report',
        'readiness',
        'set_log',
        'workout_review',
        'workout_session'
      )
  );
$function$
