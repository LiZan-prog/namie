import { FORMS, OTHER } from '../config.js';
import { medsFor, strengthsFor } from '../lib/catalog.js';
import { opts, toggle } from '../lib/dom.js';

// A block of fields for ONE medication: Medication + Strength dropdowns (from the catalog,
// with an "Other (specify)" choice), Form, and Dose. Used when adding a patient, adding a
// medication to a patient, and dispensing to a patient with no medication yet.
//
// Returns { el, read }. Put "el" in the page; call read() on submit to get the values.
export function createMedicationPicker(catalog, condition) {
  const el = document.createElement('div');
    const names = medsFor(catalog, condition).map((m) => m.name);
      el.innerHTML = `
          <div class="two">
                <div><label>Medication</label>
                        <select data-f="med" required><option value="">Select</option>${opts([...names, OTHER], '')}</select>
                                <input data-f="medOther" class="hide" placeholder="Specify medication" style="margin-top:8px"></div>
                                      <div><label>Strength</label>
                                              <select data-f="str"></select>
                                                      <input data-f="strOther" class="hide" placeholder="Specify strength" style="margin-top:8px"></div>
                                                          </div>
                                                              <div class="two">
                                                                    <div><label>Form</label><select data-f="form">${opts(FORMS, 'Tablet')}</select></div>
                                                                          <div><label>Dose and frequency</label><input data-f="dose" placeholder="e.g. 1 tablet twice daily"></div>
                                                                              </div>`;

                                                                                const f = (name) => el.querySelector(`[data-f="${name}"]`);

                                                                                  function fillStrengths() {
                                                                                      const list = strengthsFor(catalog, condition, f('med').value);
                                                                                          f('str').innerHTML = `<option value="">Not specified</option>${opts([...list, OTHER], '')}`;
                                                                                              syncOther();
                                                                                                }

                                                                                                  function syncOther() {
                                                                                                      const medOther = f('med').value === OTHER;
                                                                                                          const strOther = f('str').value === OTHER;
                                                                                                              toggle(f('medOther'), medOther);
                                                                                                                  f('medOther').required = medOther;
                                                                                                                      toggle(f('strOther'), strOther);
                                                                                                                          f('strOther').required = strOther;
                                                                                                                            }

                                                                                                                              el.addEventListener('change', (e) => {
                                                                                                                                  if (e.target === f('med')) fillStrengths();
                                                                                                                                      else syncOther();
                                                                                                                                        });
                                                                                                                                          fillStrengths();

                                                                                                                                            function read() {
                                                                                                                                                const med = f('med').value === OTHER ? f('medOther').value : f('med').value;
                                                                                                                                                    const str = f('str').value === OTHER ? f('strOther').value : f('str').value;
                                                                                                                                                        return {
                                                                                                                                                              medication: med.trim(),
                                                                                                                                                                    strength: str.trim(),
                                                                                                                                                                          form: f('form').value,
                                                                                                                                                                                dose: f('dose').value.trim() || 'Standard dosage',
                                                                                                                                                                                    };
                                                                                                                                                                                      }

                                                                                                                                                                                        return { el, read };
                                                                                                                                                                                        }
                                                                                                                                                                                        