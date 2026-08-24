-- FIT4LIFE - trainer tiers (standard / premium)
-- ============================================================================
-- WHAT THIS DOES
--   Adds a tier to each trainer account. Standard trainers cover Flex clients;
--   premium trainers cover Bronze, Silver and Gold. Every existing trainer
--   becomes STANDARD, so promote your premium trainers afterwards in the app
--   under Coach workspace -> Trainer Access.
--
-- HOW TO RUN IT
--   1. Go to supabase.com and open your FIT4LIFE project.
--   2. In the left sidebar click "SQL Editor".
--   3. Click "New query".
--   4. Paste this whole file in.
--   5. Click "Run".
--   6. You should see "Success. No rows returned".
--
-- It is safe to run more than once - nothing is duplicated or reset.
-- Run this BEFORE or AFTER uploading the app; the app hides every tier control
-- until it finds these functions, so neither order breaks anything.
-- ============================================================================

-- 1. The column. Existing rows become standard.
alter table public.memberships
  add column if not exists trainer_tier text not null default 'staff_standard';

-- 2. Only the two known values are allowed.
alter table public.memberships drop constraint if exists memberships_trainer_tier_check;
alter table public.memberships
  add constraint memberships_trainer_tier_check
  check (trainer_tier in ('staff_standard','staff_premium'));

-- 3. Read the tiers for everyone in your gym.
--    security definer, because a trainer can only see their own membership row
--    otherwise, and every colleague would show as having no tier.
create or replace function public.list_fit4life_trainer_tiers()
returns table (user_id uuid, trainer_tier text)
language sql
security definer
set search_path = public
as $$
  select m.user_id, m.trainer_tier
    from public.memberships m
   where m.organization_id in (
           select mine.organization_id
             from public.memberships mine
            where mine.user_id = auth.uid()
              and mine.is_active
              and mine.role in ('owner','trainer')
         )
     and m.role in ('owner','trainer');
$$;

-- 4. Change one trainer's tier. Owner only, checked here in the database and
--    not merely in the browser.
create or replace function public.set_fit4life_trainer_tier(target_user uuid, target_tier text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_org uuid;
begin
  if target_tier not in ('staff_standard','staff_premium') then
    raise exception 'Unknown trainer tier %', target_tier;
  end if;

  select mine.organization_id into caller_org
    from public.memberships mine
   where mine.user_id = auth.uid()
     and mine.is_active
     and mine.role = 'owner'
   limit 1;

  if caller_org is null then
    raise exception 'Only an owner can change a trainer tier';
  end if;

  update public.memberships
     set trainer_tier = target_tier
   where user_id = target_user
     and organization_id = caller_org
     and role = 'trainer';

  return found;
end;
$$;

revoke all on function public.list_fit4life_trainer_tiers() from public;
revoke all on function public.set_fit4life_trainer_tier(uuid, text) from public;
grant execute on function public.list_fit4life_trainer_tiers() to authenticated;
grant execute on function public.set_fit4life_trainer_tier(uuid, text) to authenticated;

-- ============================================================================
-- TO UNDO (only if something went wrong)
--   drop function if exists public.set_fit4life_trainer_tier(uuid, text);
--   drop function if exists public.list_fit4life_trainer_tiers();
--   The column can stay - it harms nothing and keeps your promotions.
-- ============================================================================
