-- =====================================================================
-- KMH Chronic Patient Care - database schema (v2)
-- Run this FIRST in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to run more than once, and safe on a database that already has
-- data from the old schema: it only adds what is missing and converts
-- old values. No rows are deleted from patients, medications,
-- dispenses, short-term treatments or notes.
--
-- What changed from v1:
--   1. patients.extra_conditions  - a patient can have more than one chronic condition
--   2. "Hypertension/Heart Failure" is split into "Hypertension" and
--      "Heart Failure" (patients, their extra conditions, and the medication catalog)
-- =====================================================================

-- Patient IDs (ID 0001, ID 0002, ...) are created automatically by the database.
create sequence if not exists public.patient_number_seq start 1;

-- One row per patient. "last_given" + "refill_every" decide when the next refill is due.
create table if not exists public.patients (
  id             uuid primary key default gen_random_uuid(),
  pid            text not null unique
                   default ('ID ' || lpad(nextval('public.patient_number_seq')::text, 4, '0')),
  name           text not null,
  phone          text not null default '',
  dob            date,
  sex            text check (sex in ('Female', 'Male')),
  address        text not null default '',
  condition      text not null,
  refill_every   integer not null default 30 check (refill_every > 0),
  last_given     date,
  alt_medication text not null default '',   -- set when an alternative was given at the last dispense
  alt_reason     text not null default '',
  created_at     timestamptz not null default now()
);

-- NEW in v2: additional chronic conditions beyond the main one in "condition".
alter table public.patients
  add column if not exists extra_conditions text[] not null default '{}';

-- The patient's regular (chronic) medication. A patient can have several.
create table if not exists public.patient_medications (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.patients (id) on delete cascade,
  medication  text not null,
  strength    text not null default '',
  form        text not null default 'Tablet',
  dose        text not null default 'Standard dosage',
  created_at  timestamptz not null default now()
);
create index if not exists patient_medications_patient_idx on public.patient_medications (patient_id);

-- Every time medication is dispensed (the history list).
create table if not exists public.dispenses (
  id                uuid primary key default gen_random_uuid(),
  patient_id        uuid not null references public.patients (id) on delete cascade,
  dispensed_on      date not null,
  alternative       text not null default '',   -- empty unless a substitute was given
  medications_given text not null default '',   -- text snapshot of what was given
  created_at        timestamptz not null default now()
);
create index if not exists dispenses_patient_idx on public.dispenses (patient_id, dispensed_on desc);
create index if not exists dispenses_date_idx on public.dispenses (dispensed_on);

-- Short treatments given during a visit (malaria, cough, UTI, STI ...), usually under a week.
create table if not exists public.short_term_treatments (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.patients (id) on delete cascade,
  prescribed_on date not null,
  medication    text not null,
  strength      text not null default '',
  form          text not null default 'Tablet',
  dose          text not null default 'Standard dosage',
  condition     text not null,
  days          integer not null check (days between 1 and 14),
  created_at    timestamptz not null default now()
);
create index if not exists short_term_patient_idx on public.short_term_treatments (patient_id);

-- Pharmacist notes, specific to one patient.
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.patients (id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists notes_patient_idx on public.notes (patient_id);

-- The list of known medications per condition (feeds the dropdowns).
-- kind = 'medication' for the normal drugs, 'alternative' for substitutes.
create table if not exists public.medication_catalog (
  id         uuid primary key default gen_random_uuid(),
  sort_order bigint generated always as identity,
  condition  text not null,
  kind       text not null check (kind in ('medication', 'alternative')),
  name       text not null default '',
  strengths  text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists medication_catalog_condition_idx on public.medication_catalog (condition);

-- =====================================================================
-- MIGRATION of existing data (does nothing on a fresh database, and
-- does nothing the second time it runs).
-- =====================================================================

-- 1. Patients: main condition.
update public.patients
set condition = 'Hypertension'
where condition = 'Hypertension/Heart Failure';

-- 2. Patients: additional conditions (rename, de-duplicate, and drop any
--    that now equal the main condition).
update public.patients p
set extra_conditions = array(
  select distinct m
  from (
    select case when c = 'Hypertension/Heart Failure' then 'Hypertension' else c end as m
    from unnest(p.extra_conditions) as c
  ) s
  where m <> p.condition
)
where 'Hypertension/Heart Failure' = any (p.extra_conditions);

-- 3. Medication catalog: copy the old combined list to BOTH new conditions
--    (keeping any edits the pharmacist made), then remove the old rows.
do $$
declare
  target text;
begin
  if exists (select 1 from public.medication_catalog where condition = 'Hypertension/Heart Failure') then
    foreach target in array array['Hypertension', 'Heart Failure'] loop
      if not exists (select 1 from public.medication_catalog where condition = target) then
        insert into public.medication_catalog (condition, kind, name, strengths)
        select target, kind, name, strengths
        from public.medication_catalog
        where condition = 'Hypertension/Heart Failure'
        order by sort_order;
      end if;
    end loop;
    delete from public.medication_catalog where condition = 'Hypertension/Heart Failure';
  end if;
end $$;

-- =====================================================================
-- Starting medication list (only inserted when the catalog is empty).
-- The pharmacist can change all of this later on the app's Medications page.
-- =====================================================================
insert into public.medication_catalog (condition, kind, name, strengths)
select condition, kind, name, strengths
from (
  select * from (values
    ('Asthma',          'medication',  'Salbutamol',       array['4mg']::text[]),
    ('Asthma',          'alternative', 'Prednisone',       array['5mg']::text[]),
    ('Diabetes Type 1', 'medication',  'Soluble insulin',  array['100 units/ml']::text[]),
    ('Diabetes Type 1', 'medication',  'Lente insulin',    array['100 units/ml']::text[]),
    ('Diabetes Type 1', 'medication',  'Biphasic insulin', array['100 units/ml']::text[]),
    ('Diabetes Type 2', 'medication',  'Metformin',        array['500mg']::text[]),
    ('Diabetes Type 2', 'medication',  'Glibenclamide',    array['5mg']::text[]),
    ('Epilepsy',        'medication',  'Carbamazepine',    array['200mg']::text[])
  ) as a (condition, kind, name, strengths)
  union all
  select c, 'medication', m.name, m.strengths
  from unnest(array['Hypertension', 'Heart Failure']) as c
  cross join (values
    ('Amlodipine', array['10mg']::text[]),
    ('Nifedipine', array['10mg','20mg']::text[]),
    ('Moduretic',  array['55mg']::text[]),
    ('Furosemide', array['40mg']::text[]),
    ('Atenolol',   array[]::text[]),
    ('Enalapril',  array['5mg','10mg','20mg']::text[])
  ) as m (name, strengths)
) seed
where not exists (select 1 from public.medication_catalog);
