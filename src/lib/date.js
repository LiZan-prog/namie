// Date helpers. Dates are handled as plain "YYYY-MM-DD" strings (what Postgres "date" returns),
// calculated in UTC so time zones and daylight saving never shift a day.
export const iso = (d) => d.toISOString().slice(0, 10);

export const dayNum = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5;

export function today() {
  const n = new Date();
    return iso(new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())));
    }

    export const addDays = (s, n) => iso(new Date((dayNum(s) + n) * 864e5));

    // "2026-10-31" or a full timestamp -> "31 Oct 2026"
    export function fmt(s) {
      if (!s) return '—';
        return new Date(String(s).slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
              });
              }

              export const ageFrom = (dob) => (dob ? Math.floor((dayNum(today()) - dayNum(dob)) / 365.25) : null);
              