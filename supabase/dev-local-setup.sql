-- Local development database setup for Bake Ops
-- ---------------------------------------------------------------------------
-- Run this AFTER `supabase start`, against the local database, e.g.:
--   docker exec -i $(docker ps --filter name=supabase_db --format '{{.Names}}' | head -1) \
--     psql -U postgres -d postgres < supabase/dev-local-setup.sql
--
-- Why this file exists (all reconcile pre-existing drift; it does NOT change app code):
--   1. supabase/migrations/007b_settings_and_cleanup.sql is silently skipped by the
--      Supabase CLI because its filename doesn't match "<timestamp>_name.sql".
--   2. The app + app/SUPABASE_SETUP.md reference bakers columns that no migration creates
--      (is_beta_tester, role, zip_code, email).
--   3. The migrations enable RLS + policies but never GRANT DML on public tables to the
--      Data API roles (anon/authenticated). On hosted Supabase these grants come from
--      default privileges; the local stack needs them applied explicitly. RLS still
--      governs row-level access.
-- This script is idempotent.
-- ---------------------------------------------------------------------------

-- (1) Contents of the skipped 007b migration
alter table public.bakers add column if not exists email_leads boolean default true;
alter table public.bakers add column if not exists order_updates boolean default true;
create index if not exists idx_bakers_referral_code on public.bakers(referral_code);

-- (2) Columns referenced by the app / SUPABASE_SETUP.md but missing from migrations
alter table public.bakers add column if not exists is_beta_tester boolean default true;
alter table public.bakers add column if not exists role text default 'baker';
alter table public.bakers add column if not exists zip_code text;
alter table public.bakers add column if not exists business_name text;
alter table public.bakers add column if not exists email text;

-- (3) Auto-create a baker profile on signup (app/SUPABASE_SETUP.md section 1).
--     The dashboard layout also self-heals via an upsert, but this makes the profile
--     exist immediately after signup.
create or replace function public.handle_new_baker_profile()
returns trigger as $$
declare
  generated_referral_code text;
begin
  generated_referral_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  insert into public.bakers (id, email, trial_ends_at, referral_code, is_beta_tester, onboarding_completed, created_at, updated_at)
  values (new.id, new.email, now() + interval '14 days', generated_referral_code, true, false, now(), now())
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_baker_profile();

-- Back-fill any existing auth users that lack a baker profile
insert into public.bakers (id, email, trial_ends_at, referral_code, is_beta_tester, onboarding_completed, created_at, updated_at)
select u.id, u.email, now() + interval '14 days',
       upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6)), true, false, now(), now()
from auth.users u
where u.id not in (select id from public.bakers)
on conflict (id) do nothing;

-- (4) Standard Supabase Data API grants (RLS still enforces row access)
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated, service_role;
