// Helpers for the medication catalog: { [condition]: { meds: [{id,name,strengths}], alts: [...] } }
// Most helpers accept ONE condition (a string) or SEVERAL (an array), because a patient can have
// more than one chronic condition. Results from several conditions are merged without repeats.
const first = (name) => String(name || '').split(' ')[0];
const asList = (c) => (Array.isArray(c) ? c : [c]);
const uniq = (list) => [...new Set(list)];

export const medsFor = (catalog, conditions) =>
  asList(conditions).flatMap((c) => (catalog[c] || {}).meds || []).filter((m) => m.name);

export const medNamesFor = (catalog, conditions) => uniq(medsFor(catalog, conditions).map((m) => m.name));

export const strengthsFor = (catalog, conditions, medName) =>
  uniq(medsFor(catalog, conditions).filter((m) => m.name === medName).flatMap((m) => m.strengths));

// "Prednisone 5mg" entries for the alternative-medication dropdown.
export const altLabels = (catalog, conditions) =>
  uniq(
    asList(conditions).flatMap((c) =>
      ((catalog[c] || {}).alts || [])
        .filter((a) => a.name)
        .flatMap((a) => (a.strengths.length ? a.strengths.map((s) => `${a.name} ${s}`) : [a.name]))),
  );

// Which of the given conditions list this medication in the catalog.
export const conditionsFor = (catalog, conditions, medName) =>
  conditions.filter((c) => ((catalog[c] || {}).meds || []).some((m) => m.name === medName));

// Every drug name in the catalog (first word), for the dashboard medication filter.
export function catalogMedNames(catalog) {
  return Object.values(catalog).flatMap((c) => [...c.meds, ...c.alts].map((m) => first(m.name))).filter(Boolean);
}
