CREATE OR REPLACE FUNCTION public.audit_and_protect_fit4life_membership()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  remaining_active_owners integer;
  audit_action text;
  audit_reason text := nullif(current_setting('fit4life.membership_reason', true), '');
begin
  if tg_op = 'DELETE'
     and old.role = 'owner'
     and old.is_active then
    select count(*) into remaining_active_owners
    from public.memberships membership
    where membership.organization_id = old.organization_id
      and membership.role = 'owner'
      and membership.is_active
      and membership.id <> old.id;

    if remaining_active_owners < 1 then
      raise exception 'Every gym must keep at least one active owner. Promote another owner before changing this account.';
    end if;
  elsif tg_op = 'UPDATE'
     and old.role = 'owner'
     and old.is_active
     and (new.role <> 'owner' or not new.is_active) then
    select count(*) into remaining_active_owners
    from public.memberships membership
    where membership.organization_id = old.organization_id
      and membership.role = 'owner'
      and membership.is_active
      and membership.id <> old.id;

    if remaining_active_owners < 1 then
      raise exception 'Every gym must keep at least one active owner. Promote another owner before changing this account.';
    end if;
  end if;

  if tg_op = 'INSERT' then
    audit_action := 'membership_granted';
    insert into public.membership_audit_log (
      organization_id, target_user_id, action, previous_role, new_role,
      previous_active, new_active, changed_by, change_reason
    ) values (
      new.organization_id, new.user_id, audit_action, null, new.role,
      null, new.is_active, (select auth.uid()), coalesce(audit_reason, 'Membership created')
    );
    return new;
  elsif tg_op = 'DELETE' then
    audit_action := 'membership_removed';
    insert into public.membership_audit_log (
      organization_id, target_user_id, action, previous_role, new_role,
      previous_active, new_active, changed_by, change_reason
    ) values (
      old.organization_id, old.user_id, audit_action, old.role, null,
      old.is_active, null, (select auth.uid()), coalesce(audit_reason, 'Membership removed')
    );
    return old;
  end if;

  if old.role is distinct from new.role then
    audit_action := 'role_changed';
  elsif old.is_active and not new.is_active then
    audit_action := 'access_deactivated';
  elsif not old.is_active and new.is_active then
    audit_action := 'access_reactivated';
  else
    audit_action := 'membership_updated';
  end if;

  if old.role is distinct from new.role
     or old.is_active is distinct from new.is_active then
    insert into public.membership_audit_log (
      organization_id, target_user_id, action, previous_role, new_role,
      previous_active, new_active, changed_by, change_reason
    ) values (
      new.organization_id, new.user_id, audit_action, old.role, new.role,
      old.is_active, new.is_active, (select auth.uid()), coalesce(audit_reason, 'Membership changed')
    );
  end if;

  return new;
end;
$function$
