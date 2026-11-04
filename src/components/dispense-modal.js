import { DEFAULT_REFILL_DAYS, OTHER } from '../config.js';
import { recordDispense } from '../supabase.js';
import { altLabels, conditionsFor } from '../lib/catalog.js';
import { esc, notify, opts, toggle, withBusy } from '../lib/dom.js';
import { today } from '../lib/dates.js';
import { conditionsOf, medLine } from '../lib/status.js';
import { createMedicationPicker } from './medication-picker.js';
import { readShortTerm, setShortTermRequired, shortTermFields } from './short-term-fields.js';

// The "Dispense medication" window. Used from the Dashboard and from a patient's page.
//   host    - element to attach the window to
//   patient - patient object (with .medications)
//   catalog - medication catalog
//   onDone  - called after a successful save, so the page can reload its data
//
// A patient can have several conditions. Conditions that already have a medication on file are
// dispensed as usual; for conditions with none yet, the window offers a medication to add.
export function openDispenseModal({ host, patient, catalog, onDone }) {
  const conds = conditionsOf(patient);
  const meds = patient.medications;
  const hasMeds = meds.length > 0;
  const alts = altLabels(catalog, conds);
  const uncovered = conds.filter((c) => !meds.some((m) => conditionsFor(catalog, [c], m.medication).length));
  const pickers = uncovered.map((c) => ({ cond: c, picker: createMedicationPicker(catalog, [c], { optional: true }) }));

  const rxLine = (m) => {
    const forConds = conditionsFor(catalog, conds, m.medication);
    return `<div>${esc(medLine(m))}<div class="sub" style="font-weight:400">${esc(m.dose)}${forConds.length ? ' · for ' + esc(forConds.join(', ')) : ''}</div></div>`;
  };

  const overlay = document.createElement('div');
  overlay.className = 'ov';
  overlay.innerHTML = `
    <div class="box modal" role="dialog" aria-modal="true" aria-label="Dispense medication">
      <div class="mh"><div><b>Dispense medication</b><div class="sub">${esc(patient.name)} (${esc(patient.pid)})</div></div>
        <button type="button" class="x" data-close aria-label="Close">×</button></div>
      <form class="mb">
        ${hasMeds ? `<label>Standard prescription</label><div class="rx">${meds.map(rxLine).join('')}</div>` : ''}
        ${uncovered.length
          ? `<label style="margin-top:14px">${hasMeds ? 'Other conditions with no medication on file' : 'Medication by condition'}</label><div id="newmeds"></div>`
          : ''}
        ${hasMeds ? '' : `<label>Refill every (days)</label><input name="every" type="number" min="1" value="${DEFAULT_REFILL_DAYS}">`}
        <label style="margin-top:14px">Dispensed date</label>
        <input type="date" name="date" required value="${today()}">
        <label class="chk" style="margin-top:14px"><input type="checkbox" name="isAlt">Alternative medication substituted</label>
        <div id="altbox" class="hide" style="margin-top:12px">
          <label>Alternative given</label>
          <select name="altsel"><option value="">Select</option>${opts([...alts, OTHER], '')}</select>
          <input name="altother" class="hide" placeholder="Specify alternative" style="margin-top:8px">
          <label style="margin-top:10px">Reason for substitution</label>
          <input name="reason" placeholder="e.g. Out of stock">
        </div>
        <label class="chk" style="margin-top:14px"><input type="checkbox" name="isSt">Also prescribe a short-term treatment</label>
        <div id="stbox" class="hide" style="margin-top:12px">${shortTermFields('dst_')}</div>
        <div class="acts" style="margin-top:20px">
          <button type="button" class="btn sm" data-close>Cancel</button>
          <button class="btn p sm">Confirm dispense</button>
        </div>
      </form>
    </div>`;
  host.appendChild(overlay);

  const slot = overlay.querySelector('#newmeds');
  if (slot) {
    pickers.forEach(({ cond, picker }) => {
      const wrap = document.createElement('div');
      wrap.className = 'sb';
      wrap.innerHTML = `<b style="font-size:13px;display:block;margin-bottom:10px">${esc(cond)}</b>`;
      wrap.appendChild(picker.el);
      slot.appendChild(wrap);
    });
  }

  const form = overlay.querySelector('form');
  setShortTermRequired(form, 'dst_', false);

  function close() {
    document.removeEventListener('keydown', onKey);
    overlay.remove();
  }
  function onKey(e) { if (e.key === 'Escape') close(); }
  document.addEventListener('keydown', onKey);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('[data-close]')) close();
  });

  form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'isAlt') {
      toggle(overlay.querySelector('#altbox'), t.checked);
      form.elements.altsel.required = t.checked;
      form.elements.reason.required = t.checked;
    } else if (t.name === 'altsel') {
      toggle(form.elements.altother, t.value === OTHER);
      form.elements.altother.required = t.value === OTHER;
    } else if (t.name === 'isSt') {
      toggle(overlay.querySelector('#stbox'), t.checked);
      setShortTermRequired(form, 'dst_', t.checked);
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newMedications = pickers.map((r) => r.picker.read()).filter(Boolean);
    if (!hasMeds && !newMedications.length) {
      notify('Select a medication for at least one condition.', 'err');
      return;
    }
    const isAlt = form.elements.isAlt.checked;
    const alternative = isAlt
      ? (form.elements.altsel.value === OTHER ? form.elements.altother.value : form.elements.altsel.value).trim()
      : '';
    const ok = await withBusy(e.submitter, async () => {
      await recordDispense(patient, {
        date: form.elements.date.value,
        newMedications,
        refillEvery: Number(form.elements.every && form.elements.every.value) || DEFAULT_REFILL_DAYS,
        alternative,
        reason: isAlt ? form.elements.reason.value.trim() : '',
        shortTerm: form.elements.isSt.checked ? readShortTerm(form, 'dst_') : null,
      });
      return true;
    });
    if (ok) {
      close();
      notify('Dispense recorded');
      await onDone();
    }
  });
}
