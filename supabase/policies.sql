-- =====================================================================
-- KMH Chronic Patient Care - security rules (v2)
-- Run this SECOND (after schema.sql) in the Supabase SQL Editor.
-- Safe to run more than once, and safe on the existing database.
--
-- What it does: turns on Row Level Security for every table and allows
-- ONLY a signed-in user to read and write. Anyone who is not signed in
-- (even with the public key) can see and change nothing.
--
-- What changed from v1: no new tables were added in schema v2, so the
-- rules themselves are the same. The new column (patients.extra_conditions)
-- is covered automatically. The only addition is an explicit revoke of
-- access from the public "anon" role, as a second layer on top of RLS.
-- =====================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'patients', 'patient_medications', 'dispenses',
    'short_term_treatments', 'notes', 'medication_catalog'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "signed-in pharmacist full access" on public.%I', t);
    execute format(
      'create policy "signed-in pharmacist full access" on public.%I for all to authenticated using (true) with check (true)', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Lets signed-in users create the automatic patient numbers.
revoke all on sequence public.patient_number_seq from anon;
grant usage, select on sequence public.patient_number_seq to authenticated;
