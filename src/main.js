// =====================================================================
// App start-up and page routing.
//   - checks the Supabase settings and the sign-in state
//   - shows the login screen, or the page that matches the address (#/dashboard ...)
// Each page lives in src/pages/ and exports render(view, { params, go }).
// =====================================================================
import './style.css';
import { getSession, isConfigured, onAuthChange, signOut } from './supabase.js';
import { renderShell } from './components/layout.js';
import { renderLogin } from './pages/login.js';
import { render as dashboard } from './pages/dashboard.js';
import { render as patients } from './pages/patients.js';
import { render as addPatient } from './pages/add-patient.js';
import { render as patientDetail } from './pages/patient-details.js';
import { render as medications } from './pages/medication.js';
import { showLoadError } from './lib/dom.js';

const app = document.getElementById('app');
let signedIn = false;

// Order matters: "/patients/new" must come before "/patients/:id".
const routes = [
  { pattern: /^#\/dashboard$/, tab: 'dash', page: dashboard },
    { pattern: /^#\/patients$/, tab: 'pts', page: patients },
      { pattern: /^#\/patients\/new$/, tab: 'pts', page: addPatient },
        { pattern: /^#\/patients\/([^/]+)$/, tab: 'pts', page: patientDetail },
          { pattern: /^#\/medications$/, tab: 'meds', page: medications },
          ];

          const go = (hash) => { location.hash = hash; };

          function findRoute() {
            const hash = location.hash || '#/dashboard';
              for (const r of routes) {
                  const m = hash.match(r.pattern);
                      if (m) return { ...r, params: m.slice(1).map(decodeURIComponent) };
                        }
                          return null;
                          }

                          async function showPage() {
                            if (!signedIn) {
                                renderLogin(app, onLoggedIn);
                                    return;
                                      }
                                        const route = findRoute();
                                          if (!route) {
                                              go('#/dashboard');
                                                  return;
                                                    }
                                                      // A fresh header + page area on every navigation keeps pages independent of each other.
                                                        app.innerHTML = renderShell(route.tab);
                                                          document.getElementById('logout').addEventListener('click', () => signOut());
                                                            const view = document.getElementById('view');
                                                              window.scrollTo(0, 0);
                                                                try {
                                                                    await route.page(view, { params: route.params, go });
                                                                      } catch (err) {
                                                                          showLoadError(view, err);
                                                                            }
                                                                            }

                                                                            function onLoggedIn() {
                                                                              signedIn = true;
                                                                                if (location.hash !== '#/dashboard') go('#/dashboard'); // triggers showPage via "hashchange"
                                                                                  else showPage();
                                                                                  }

                                                                                  function showSetupNeeded() {
                                                                                    app.innerHTML = `<div class="errbox"><h2>Setup needed</h2>
                                                                                        <p>The app cannot find its Supabase settings. Add these two environment variables (see the setup manual, section on Vercel):</p>
                                                                                            <pre>VITE_SUPABASE_URL\nVITE_SUPABASE_ANON_KEY</pre>
                                                                                                <p class="sub">Running locally? Copy <b>.env.example</b> to <b>.env</b>, fill it in, then restart <b>npm run dev</b>. On Vercel, add them under Settings → Environment Variables and redeploy.</p></div>`;
                                                                                                }

                                                                                                async function start() {
                                                                                                  if (!isConfigured) {
                                                                                                      showSetupNeeded();
                                                                                                          return;
                                                                                                            }
                                                                                                              try {
                                                                                                                  signedIn = Boolean(await getSession());
                                                                                                                    } catch (err) {
                                                                                                                        console.error(err);
                                                                                                                            signedIn = false;
                                                                                                                              }
                                                                                                                                // Only react when signing in/out actually changes (Supabase also fires events on tab refocus).
                                                                                                                                  onAuthChange((session) => {
                                                                                                                                      const now = Boolean(session);
                                                                                                                                          if (now !== signedIn) {
                                                                                                                                                signedIn = now;
                                                                                                                                                      showPage();
                                                                                                                                                          }
                                                                                                                                                            });
                                                                                                                                                              window.addEventListener('hashchange', showPage);
                                                                                                                                                                showPage();
                                                                                                                                                                }

                                                                                                                                                                start();
                                                                                                                                                                