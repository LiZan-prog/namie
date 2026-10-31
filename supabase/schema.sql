-- =====================================================================
-- KMH Chronic Patient Care - database schema
-- Run this FIRST in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to run more than once (it only creates what is missing).
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

                                                                                                                 -- Starting medication list (only inserted when the catalog is empty).
                                                                                                                 -- The pharmacist can change all of this later on the app's Medications page.
                                                                                                                 insert into public.medication_catalog (condition, kind, name, strengths)
                                                                                                                 select *
                                                                                                                 from (values
                                                                                                                   ('Asthma',                    'medication',  'Salbutamol',      array['4mg']),
                                                                                                                     ('Asthma',                    'alternative', 'Prednisone',      array['5mg']),
                                                                                                                       ('Hypertension/Heart Failure','medication',  'Amlodipine',      array['10mg']),
                                                                                                                         ('Hypertension/Heart Failure','medication',  'Nifedipine',      array['10mg','20mg']),
                                                                                                                           ('Hypertension/Heart Failure','medication',  'Moduretic',       array['55mg']),
                                                                                                                             ('Hypertension/Heart Failure','medication',  'Furosemide',      array['40mg']),
                                                                                                                               ('Hypertension/Heart Failure','medication',  'Atenolol',        array[]::text[]),
                                                                                                                                 ('Hypertension/Heart Failure','medication',  'Enalapril',       array['5mg','10mg','20mg']),
                                                                                                                                   ('Diabetes Type 1',           'medication',  'Soluble insulin', array['100 units/ml']),
                                                                                                                                     ('Diabetes Type 1',           'medication',  'Lente insulin',   array['100 units/ml']),
                                                                                                                                       ('Diabetes Type 1',           'medication',  'Biphasic insulin',array['100 units/ml']),
                                                                                                                                         ('Diabetes Type 2',           'medication',  'Metformin',       array['500mg']),
                                                                                                                                           ('Diabetes Type 2',           'medication',  'Glibenclamide',   array['5mg']),
                                                                                                                                             ('Epilepsy',                  'medication',  'Carbamazepine',   array['200mg'])
                                                                                                                                             ) as seed (condition, kind, name, strengths)
                                                                                                                                             where not exists (select 1 from public.medication_catalog);