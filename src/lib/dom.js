// Small DOM helpers shared by every page.
const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// Always escape text that comes from the database or the user before putting it in HTML.
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ENTITIES[c]);

export const opts = (list, selected) =>
  list.map((x) => `<option${x === selected ? ' selected' : ''}>${esc(x)}</option>`).join('');

  export const $ = (sel, root = document) => root.querySelector(sel);

  export const toggle = (el, show) => el.classList.toggle('hide', !show);

  // Floating message at the bottom of the screen. kind: 'ok' or 'err'.
  export function notify(message, kind = 'ok', ms = kind === 'err' ? 7000 : 1800) {
    const el = document.createElement('div');
      el.className = 'note' + (kind === 'err' ? ' err' : '');
        el.setAttribute('role', kind === 'err' ? 'alert' : 'status');
          el.textContent = message;
            document.body.appendChild(el);
              setTimeout(() => el.remove(), ms);
              }

              // Report an error to the user and to the browser console (for troubleshooting).
              export function reportError(err) {
                console.error(err);
                  notify(err && err.message ? err.message : String(err), 'err');
                  }

                  // Run a save action while a button is disabled, and report any error.
                  export async function withBusy(button, action) {
                    if (button) button.disabled = true;
                      try {
                          return await action();
                            } catch (err) {
                                reportError(err);
                                    return undefined;
                                      } finally {
                                          if (button) button.disabled = false;
                                            }
                                            }

                                            // Shown when a page fails to load (for example the database is unreachable).
                                            export function showLoadError(view, err) {
                                              console.error(err);
                                                view.innerHTML = `<div class="errbox"><h2>Something went wrong loading this page</h2>
                                                    <p class="sub">Check your internet connection, then refresh the page. If it keeps happening, see the Troubleshooting section of the setup manual.</p>
                                                        <pre>${esc(err && err.message ? err.message : err)}</pre></div>`;
                                                        }
                                                        