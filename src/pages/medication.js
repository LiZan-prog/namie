import { CONDITIONS } from '../config.js';
import { addCatalogRow, deleteCatalogRow, listCatalog, updateCatalogRow } from '../supabase.js';
import { esc, notify, reportError, showLoadError } from '../lib/dom.js';

// Medications page: the pharmacist edits the medication list for each condition
// (names, strengths, and alternative medications). Changes save as soon as a field is left.
export async function render(view) {
  let catalog = {};

  function block(condition, kind, title, addLabel) {
    const list = (catalog[condition] || {})[kind === 'medication' ? 'meds' : 'alts'] || [];
    return `<div class="sub" style="font-weight:600;margin:0 0 8px;color:var(--fg)">${title}</div>
                  ${list.map((m) => `<div class="mrow" data-row="${esc(m.id)}">
                          <input data-field="name" value="${esc(m.name)}" placeholder="Medication name" aria-label="Medication name">
                                  <input data-field="strengths" value="${esc(m.strengths.join(', '))}" placeholder="Strengths, comma separated e.g. 10mg, 20mg" aria-label="Strengths">
                                          <button type="button" class="x" data-delete="${esc(m.id)}" aria-label="Remove" style="color:var(--mut)">×</button></div>`).join('')}
                                                <button type="button" class="btn sm" data-add="${kind}" data-cond="${esc(condition)}">+ ${addLabel}</button>`;
  }

  function draw() {
    view.innerHTML = `<div class="top"><h2>Medications</h2></div>
      <p class="sub" style="margin:-8px 0 18px">The medications and alternatives for each condition. Changes save automatically and feed the dropdowns when adding or dispensing.</p>
                                                                    ${CONDITIONS.map((c) => `<div class="box sec"><h3>${esc(c)}</h3>${block(c, 'medication', 'Medications', 'Add medication')}
                                                                            <div style="height:16px"></div>${block(c, 'alternative', 'Alternative medications', 'Add alternative')}</div>`).join('')}
                                                                    ${catalog[LEGACY_COMBINED_CONDITION] ? `<div class="box sec"><h3>Legacy catalog: ${esc(LEGACY_COMBINED_CONDITION)}</h3>
                                                                      <p class="sub">These existing entries have not been assigned to Hypertension or Heart Failure. Review them before adding any medication to the new condition lists.</p>
                                                                      ${block(LEGACY_COMBINED_CONDITION, 'medication', 'Medications', 'Add medication')}<div style="height:16px"></div>
                                                                      ${block(LEGACY_COMBINED_CONDITION, 'alternative', 'Alternative medications', 'Add alternative')}</div>` : ''}`;
  }

  async function reload() {
    catalog = await listCatalog();
    draw();
  }

  // Save a row when either of its fields is changed.
  view.addEventListener('change', async (e) => {
    const row = e.target.closest('[data-row]');
    if (!row) return;
    const name = row.querySelector('[data-field="name"]').value.trim();
    const strengths = row.querySelector('[data-field="strengths"]').value.split(',').map((x) => x.trim()).filter(Boolean);
    try {
      await updateCatalogRow(row.dataset.row, { name, strengths });
      notify('Saved');
    } catch (err) {
      reportError(err);
    }
  });

  view.addEventListener('click', async (e) => {
    const add = e.target.closest('[data-add]');
    const del = e.target.closest('[data-delete]');
    try {
      if (add) {
        await addCatalogRow(add.dataset.cond, add.dataset.add);
        await reload();
      } else if (del) {
        await deleteCatalogRow(del.dataset.delete);
        await reload();
      }
    } catch (err) {
      reportError(err);
    }
  });

  try {
    await reload();
  } catch (err) {
    showLoadError(view, err);
  }
}
