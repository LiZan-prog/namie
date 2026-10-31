// Helpers for the medication catalog: { [condition]: { meds: [{id,name,strengths}], alts: [...] } }
const first = (name) => String(name || '').split(' ')[0];

export const medsFor = (catalog, condition) => ((catalog[condition] || {}).meds || []).filter((m) => m.name);

export function strengthsFor(catalog, condition, medName) {
  const m = medsFor(catalog, condition).find((x) => x.name === medName);
    return m ? m.strengths : [];
    }

    // "Prednisone 5mg" entries for the alternative-medication dropdown.
    export function altLabels(catalog, condition) {
      return ((catalog[condition] || {}).alts || [])
          .filter((a) => a.name)
              .flatMap((a) => (a.strengths.length ? a.strengths.map((s) => `${a.name} ${s}`) : [a.name]));
              }

              // Every drug name in the catalog (first word), for the dashboard medication filter.
              export function catalogMedNames(catalog) {
                return Object.values(catalog).flatMap((c) => [...c.meds, ...c.alts].map((m) => first(m.name))).filter(Boolean);
                }
                