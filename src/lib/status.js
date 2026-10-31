import { addDays, dayNum, iso, today } from './date.js';

// Works out when a patient's next refill is due and how to label it.
// Patients who have never been given medication sort to the bottom (diff 9999).
export function dueInfo(p) {
  if (!p.last_given) return { nextDue: '', diff: 9999, kind: 'none', label: 'No medication given' };
    const due = dayNum(p.last_given) + Number(p.refill_every);
      const diff = due - dayNum(today());
        const nextDue = iso(new Date(due * 864e5));
          if (diff < 0) return { nextDue, diff, kind: 'overdue', label: `Overdue by ${-diff} ${diff === -1 ? 'day' : 'days'}` };
            if (p.alt_medication) return { nextDue, diff, kind: 'sub', label: 'Substituted' };
              if (diff <= 7) return { nextDue, diff, kind: 'soon', label: diff === 0 ? 'Due today' : `Due in ${diff} ${diff === 1 ? 'day' : 'days'}` };
                return { nextDue, diff, kind: 'ok', label: 'On track' };
                }

                // "Amlodipine 10mg tablet"
                export const medLine = (m) => [m.medication, m.strength, (m.form || '').toLowerCase()].filter(Boolean).join(' ');

                export const shortTermEnd = (s) => addDays(s.prescribed_on, Number(s.days) - 1);
                export const shortTermActive = (s) => dayNum(today()) <= dayNum(s.prescribed_on) + Number(s.days) - 1;

                const first = (name) => String(name || '').split(' ')[0];

                // First words of every drug a patient has (used by the dashboard medication filter).
                export const medNames = (p) =>
                  [
                      ...p.medications.map((m) => first(m.medication)),
                          first(p.alt_medication),
                              ...p.shortTerm.map((s) => first(s.medication)),
                                ].filter(Boolean);
                                