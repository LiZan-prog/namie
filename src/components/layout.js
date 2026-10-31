// The header with the app name and the menu. "active" is 'dash', 'pts' or 'meds'.
export function renderShell(active) {
  const link = (tab, href, label) => `<a href="${href}" class="${active === tab ? 'on' : ''}">${label}</a>`;
    return `<header><h1>Welcome Mrs Mwale</h1>
        <nav>${link('dash', '#/dashboard', 'Dashboard')}${link('pts', '#/patients', 'Patients')}${link('meds', '#/medications', 'Medications')}<button id="logout" type="button">Log out</button></nav>
          </header><main id="view"><div class="loading">Loading…</div></main>`;
          }
          