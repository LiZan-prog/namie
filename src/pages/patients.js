import { CONDITIONS } from '../config.js';
import { listPatients } from '../supabase.js';
import { ageFrom } from '../lib/date.js';
import { $, esc, opts, showLoadError } from '../lib/dom.js';

// Patient list: count per condition, search, condition filter, and a link to each patient.
export async function render(view) {
  const s = { patients: [], q: '', cond: 'All conditions' };
    const groups = [...CONDITIONS, 'Other']; // "Other" = conditions typed in by hand

      const inGroup = (p, c) => (c === 'Other' ? !CONDITIONS.includes(p.condition) : p.condition === c);

        function drawList() {
            const q = s.q.toLowerCase();
                const rows = s.patients.filter(
                      (p) => (p.name.toLowerCase().includes(q) || p.pid.toLowerCase().includes(q)) &&
                              (s.cond === 'All conditions' || inGroup(p, s.cond)),
                                  );
                                      const card = (value, label, count) =>
                                            `<button type="button" class="box cc ${s.cond === value ? 'on' : ''}" data-cond="${esc(value)}"><span>${esc(label)}</span><b>${count}</b></button>`;
                                                $('#cards', view).innerHTML =
                                                      card('All conditions', 'All patients', s.patients.length) +
                                                            groups.map((c) => card(c, c, s.patients.filter((p) => inGroup(p, c)).length)).join('');
                                                                $('#pc', view).value = s.cond;
                                                                    $('#rows', view).innerHTML = rows.length
                                                                          ? rows.map((p) => {
                                                                                  const age = ageFrom(p.dob);
                                                                                          return `<tr><td><b>${esc(p.name)}</b><div class="sub">${esc(p.pid)}</div></td><td>${esc(p.sex) || '—'}</td><td>${age !== null ? age : '—'}</td><td>${esc(p.phone) || '—'}</td><td>${esc(p.condition)}</td><td style="text-align:right"><a class="btn sm" href="#/patients/${esc(p.id)}">View</a></td></tr>`;
                                                                                                }).join('')
                                                                                                      : `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--mut)">No patients found.</td></tr>`;
                                                                                                        }

                                                                                                          function draw() {
                                                                                                              view.innerHTML = `
                                                                                                                    <div class="top"><h2>Patients</h2><a class="btn p" href="#/patients/new">+ Add patient</a></div>
                                                                                                                          <div class="grid stats" id="cards" style="margin-bottom:18px"></div>
                                                                                                                                <div class="grid filters"><input id="pq" placeholder="Search by name or patient ID"><select id="pc">${opts(['All conditions', ...groups], s.cond)}</select></div>
                                                                                                                                      <div class="tw"><table class="rt rt-p"><thead><tr><th>Patient</th><th>Sex</th><th>Age</th><th>Phone</th><th>Condition</th><th style="text-align:right">Details</th></tr></thead><tbody id="rows"></tbody></table></div>`;
                                                                                                                                          drawList();
                                                                                                                                            }

                                                                                                                                              view.addEventListener('input', (e) => { if (e.target.id === 'pq') { s.q = e.target.value; drawList(); } });
                                                                                                                                                view.addEventListener('change', (e) => { if (e.target.id === 'pc') { s.cond = e.target.value; drawList(); } });
                                                                                                                                                  view.addEventListener('click', (e) => {
                                                                                                                                                      const c = e.target.closest('[data-cond]');
                                                                                                                                                          if (c) { s.cond = c.dataset.cond; drawList(); }
                                                                                                                                                            });

                                                                                                                                                              try {
                                                                                                                                                                  s.patients = await listPatients();
                                                                                                                                                                      draw();
                                                                                                                                                                        } catch (err) {
                                                                                                                                                                            showLoadError(view, err);
                                                                                                                                                                              }
                                                                                                                                                                              }
                                                                                                                                                                              