KMH Chronic Patient Care
A small web app for one clinic pharmacist to track chronic-patient medication refills. Plain JavaScript + Vite, hosted on Vercel, data and login in Supabase.
Quick start (local)
npm install
cp .env.example .env      # then fill in the two Supabase values
npm run dev               # opens http://localhost:5173
Build for production: npm run build (output in dist/). Full setup (Supabase + Vercel) is in the setup manual: ../3-Setup-Manual.md.
Folder map (where to look when something is wrong)
index.html              page shell, loads src/main.js
src/
  main.js               start-up, sign-in check, page routing (#/dashboard, #/patients ...)
  supabase.js           ALL database + login calls live here (and only here)
  config.js             fixed lists: conditions, forms, statuses
  styles.css            all styling (responsive)
  pages/                one file per screen
    login.js            sign-in screen
    dashboard.js        refill dashboard, filters, Dispense buttons
    patients.js         patient list, condition counts, search
    add-patient.js      Add patient form
    patient-detail.js   one patient: details, medication, notes, short-term, history
    medications.js      edit the medication list per condition
  components/           pieces reused by several pages
    dispense-modal.js   the Dispense window
    medication-picker.js  Medication + Strength + Form + Dose fields
    short-term-fields.js  fields for short-term treatments
    layout.js           header and menu
  lib/                  small helpers (no screens)
    dates.js  status.js  catalog.js  dom.js
supabase/
  schema.sql            tables + starting medication list (run first)
  policies.sql          security rules (run second)
Troubleshooting in one minute
Press F12 in the browser and open the Console tab: errors are printed there.
A red message at the bottom of the screen names the failing action, e.g. Saving patient: .... That text comes from src/supabase.js, so the function with that label is where to look.
Data wrong or missing? Open Supabase -> Table Editor and look at the table directly.
Blank "Setup needed" page? The two environment variables are missing (see .env.example).
