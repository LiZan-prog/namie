import { FORMS, SHORT_TERM_REASONS } from '../config.js';
import { esc, opts } from '../lib/dom.js';

// Fields for a short-term treatment (e.g. Coartem for malaria, 3 days).
// "p" is a prefix for the field names, so the same fields can sit in two different forms.
export function shortTermFields(p) {
  return `
      <div class="two"><div><label>Medication</label><input name="${p}med" placeholder="e.g. Coartem"></div>
            <div><label>Strength</label><input name="${p}str" placeholder="e.g. 20/120mg"></div></div>
                <div class="two"><div><label>Form</label><select name="${p}form">${opts(FORMS, 'Tablet')}</select></div>
                      <div><label>Dose and frequency</label><input name="${p}dose" placeholder="e.g. 4 tablets twice daily"></div></div>
                          <div class="two"><div><label>Condition being treated</label><input name="${p}cond" list="${p}list" placeholder="e.g. Malaria"></div>
                                <div><label>Number of days</label><input name="${p}days" type="number" min="1" max="14" value="5"></div></div>
                                    <datalist id="${p}list">${SHORT_TERM_REASONS.map((r) => `<option value="${esc(r)}">`).join('')}</datalist>`;
                                    }

                                    // Make the key fields required (or not), e.g. only when a checkbox is ticked.
                                    export function setShortTermRequired(form, p, required) {
                                      form.elements[p + 'med'].required = required;
                                        form.elements[p + 'cond'].required = required;
                                        }

                                        export function readShortTerm(form, p) {
                                          const v = (n) => form.elements[p + n].value.trim();
                                            return {
                                                medication: v('med'),
                                                    strength: v('str'),
                                                        form: form.elements[p + 'form'].value,
                                                            dose: v('dose') || 'Standard dosage',
                                                                condition: v('cond'),
                                                                    days: Math.min(14, Math.max(1, Number(v('days')) || 5)),
                                                                      };
                                                                      }
                                                                      