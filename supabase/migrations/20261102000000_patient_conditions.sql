begin;

alter table public.patients
  add column if not exists conditions text[] not null default '{}';

update public.patients
set conditions = array[condition]
where (conditions is null or cardinality(conditions) = 0)
  and condition is not null
  and btrim(condition) <> '';

alter table public.patients
  alter column conditions set default '{}',
  alter column conditions set not null;

comment on column public.patients.conditions is
  'Chronic conditions for this patient. The legacy condition column remains populated for older app versions.';

commit;