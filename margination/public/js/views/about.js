import { $, $$, esc, toast, confirmDialog } from '../utils.js';
import { STYLES, loadSettings, saveSettings } from '../styles.js';
import { getStatus } from '../api.js';
import { countIllustrations, clearIllustrations } from '../db.js';
import { workspace } from '../state.js';
import { marge } from '../characters.js';

export async function mountAbout(container) {
  const settings = loadSettings();

  container.innerHTML = `
    <section class="container about">
      <header class="ws-head">
        <p class="eyebrow">About &amp; settings</p>
        <h1>A small companion for reading.</h1>
      </header>

      <div class="about-grid">
        <div>
          <div class="about-intro">
            ${marge({ size: 100 })}
            <p>Margination turns a passage you select into a simple illustration, so descriptions are easier to picture. It never rewrites or summarizes what you read. It is an optional companion, and the words stay at the center.</p>
          </div>

          <h2>Privacy</h2>
          <ul class="plain-list">
            <li>The passage you illustrate is sent through Margination’s server to Google’s Gemini image service to create the picture.</li>
            <li>Margination’s server does not store or log your passages.</li>
            <li>Saved illustrations are kept in this browser (IndexedDB) on this computer only. There are no accounts and nothing is synced between devices.</li>
            <li>Clearing your browser’s site data will also remove your library, so download anything you want to keep.</li>
          </ul>
        </div>

        <div class="settings">
          <h2>Settings</h2>

          <fieldset>
            <legend>Default illustration style</legend>
            ${STYLES.map(
              (s) => `<label class="radio">
                <input type="radio" name="style" value="${s.id}" ${s.id === settings.style ? 'checked' : ''} />
                <span><strong>${esc(s.label)}</strong><small>${esc(s.desc)}</small></span>
              </label>`
            ).join('')}
          </fieldset>

          <div class="setting-row">
            <h3>Illustration service</h3>
            <p id="svc" class="muted">Checking…</p>
          </div>

          <div class="setting-row">
            <h3>Library</h3>
            <p id="lib-info" class="muted">Counting…</p>
            <button type="button" class="btn btn-danger-outline" id="clear-lib" hidden>Delete all saved illustrations</button>
          </div>
        </div>
      </div>
    </section>`;

  $$('input[name="style"]', container).forEach((r) =>
    r.addEventListener('change', () => {
      saveSettings({ style: r.value });
      workspace.style = r.value;
      toast('Default style saved.', 'success');
    })
  );

  async function refreshLibrary() {
    const info = $('#lib-info', container);
    const btn = $('#clear-lib', container);
    if (!info) return;
    try {
      const n = await countIllustrations();
      info.textContent = n
        ? `${n} saved illustration${n === 1 ? '' : 's'} in this browser.`
        : 'No saved illustrations yet.';
      btn.hidden = n === 0;
    } catch {
      info.textContent = 'The library isn’t available in this browser window.';
      btn.hidden = true;
    }
  }

  $('#clear-lib', container).addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Delete your whole library?',
      message: 'Every saved illustration will be removed from this browser. This can’t be undone.',
      confirmLabel: 'Delete all',
    });
    if (!ok) return;
    try {
      await clearIllustrations();
      toast('Library cleared.');
    } catch {
      toast('The library couldn’t be cleared. Please try again.', 'error');
    }
    refreshLibrary();
  });

  refreshLibrary();

  const status = await getStatus();
  const svc = $('#svc', container);
  if (svc) {
    if (!status) svc.textContent = 'Margination’s server couldn’t be reached. Is it running?';
    else if (!status.configured) svc.textContent = 'Not set up: add a GEMINI_API_KEY to the server’s .env file and restart.';
    else svc.textContent = `Ready. Model: ${status.imageModel}.`;
  }
}
