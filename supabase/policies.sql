-- =====================================================================
-- KMH Chronic Patient Care - security rules
-- Run this SECOND (after schema.sql) in the Supabase SQL Editor.
-- Safe to run more than once.
--
-- What it does: turns on Row Level Security for every table and allows
-- ONLY a signed-in user to read and write. Anyone who is not signed in
-- (even with the public key) can see and change nothing.
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
                                    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
                                      end loop;
                                      end $$;

                                      -- Lets signed-in users create the automatic patient numbers.
                                      grant usage, select on sequence public.patient_number_seq to authenticated;