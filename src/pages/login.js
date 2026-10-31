import { signIn } from '../supabase.js';
import { withBusy } from '../lib/dom.js';

const SV = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
const EYE = SV + '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF = SV + '<path d="M17.9 17.9A10.9 10.9 0 0112 19C5 19 1 12 1 12a18.5 18.5 0 015.1-5.9M9.9 5.1A10.9 10.9 0 0112 5c7 0 11 7 11 7a18.5 18.5 0 01-2.2 3.2M1 1l22 22"/><path d="M14.1 14.1a3 3 0 11-4.2-4.2"/></svg>';

// Sign-in screen. onSuccess() is called after a successful sign in.
export function renderLogin(root, onSuccess) {
  root.innerHTML = `<div class="login"><div class="box">
      <h1 style="font-size:24px;font-weight:700">Welcome to KMH Chronic Patient Care</h1>
          <p style="color:var(--mut);margin:4px 0 8px">Sign in to manage patient medication.</p>
              <form id="lf">
                    <div class="f"><label>Email</label><input name="email" type="email" required autocomplete="username"></div>
                          <div class="f"><label>Password</label>
                                  <div class="pw"><input name="password" type="password" required autocomplete="current-password" placeholder="Password">
                                            <button type="button" id="pw" aria-label="Show password">${EYE}</button></div></div>
                                                  <p id="lerr" class="sub" role="alert" style="color:#7a0019;margin:12px 0 0"></p>
                                                        <button class="btn p" style="width:100%;margin-top:14px;padding:10px">Sign in</button>
                                                            </form></div></div>`;

                                                              const form = root.querySelector('#lf');
                                                                const err = root.querySelector('#lerr');

                                                                  root.querySelector('#pw').addEventListener('click', (e) => {
                                                                      const input = form.elements.password;
                                                                          const show = input.type === 'password';
                                                                              input.type = show ? 'text' : 'password';
                                                                                  e.currentTarget.innerHTML = show ? EYE_OFF : EYE;
                                                                                      e.currentTarget.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
                                                                                        });

                                                                                          form.addEventListener('submit', async (e) => {
                                                                                              e.preventDefault();
                                                                                                  err.textContent = '';
                                                                                                      const done = await withBusy(e.submitter, async () => {
                                                                                                            try {
                                                                                                                    await signIn(form.elements.email.value.trim(), form.elements.password.value);
                                                                                                                            return true;
                                                                                                                                  } catch (ex) {
                                                                                                                                          err.textContent = ex.message === 'Invalid login credentials' ? 'Wrong email or password.' : ex.message;
                                                                                                                                                  return false;
                                                                                                                                                        }
                                                                                                                                                            });
                                                                                                                                                                if (done) onSuccess();
                                                                                                                                                                  });
                                                                                                                                                                  }
                                                                                                                                                                  