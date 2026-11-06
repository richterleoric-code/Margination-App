import { $, $$, esc, wordCount, titleFrom, b64ToBlob, downloadBlob, toast, confirmDialog, uid } from '../utils.js';
import { workspace as S, SAMPLES } from '../state.js';
import { STYLES, styleLabel } from '../styles.js';
import { generateIllustration } from '../api.js';
import { addIllustration } from '../db.js';
import { MAX_PASSAGE_CHARS } from '../config.js';
import { marge, pip } from '../characters.js';

const LOADING_MESSAGES = [
  'Imagining your passage…',
  'Marge is on it…',
  'Bringing this scene to life…',
  'A little imagination takes time.',
];

let root = null;
let ta = null;
let loadingTimer = null;
let abortCtl = null;
let lastWasRegen = false;

function stopLoadingTimer() {
  if (loadingTimer) clearInterval(loadingTimer);
  loadingTimer = null;
}

export function mountWorkspace(container) {
  root = container;
  container.innerHTML = `
    <section class="container workspace">
      <header class="ws-head">
        <p class="eyebrow">Reading workspace</p>
        <h1>See more in what you read.</h1>
        <p class="lede">Paste a passage, select a moment, and let Margination bring it to life.</p>
      </header>

      <div class="ws-grid">
        <div class="ws-left">
          <div class="samples" aria-label="Sample passages">
            <span>Try a sample:</span>
            ${SAMPLES.map((s) => `<button type="button" class="chip" data-sample="${s.id}">${esc(s.label)}</button>`).join('')}
          </div>

          <label class="sr-only" for="passage">Your passage</label>
          <textarea id="passage" class="passage" spellcheck="true"
            placeholder="Paste or type a passage here. Then highlight the sentence you want to see."></textarea>

          <div class="ws-meta">
            <span id="count" class="count"></span>
            <button type="button" class="link-btn" id="clear-text">Clear text</button>
          </div>

          <div class="selection" id="selection" aria-live="polite"></div>

          <div class="ws-controls">
            <label class="style-pick">
              <span>Style</span>
              <select id="style">
                ${STYLES.map((s) => `<option value="${s.id}">${esc(s.label)}</option>`).join('')}
              </select>
            </label>
            <button type="button" class="btn btn-primary btn-lg" id="generate">Illustrate</button>
          </div>
          <p class="form-error" id="form-error" role="alert" hidden></p>
          <p class="privacy-note">Selected text is sent to Google’s image service to create the picture. <a href="#/about">Privacy details</a></p>
        </div>

        <aside class="ws-right" id="panel" aria-live="polite"></aside>
      </div>
    </section>`;

  ta = $('#passage', container);
  ta.value = S.passage;
  $('#style', container).value = S.style;

  // Restore the previous selection (if any) when coming back to this page.
  if (S.sel && S.sel[1] <= ta.value.length) {
    // selection is shown in the bar; textarea highlight is restored on focus
  } else {
    S.sel = null;
  }

  ta.addEventListener('input', () => {
    S.passage = ta.value;
    S.sel = null;
    hideFormError();
    renderCount();
    renderSelection();
  });
  ['select', 'mouseup', 'keyup'].forEach((ev) => ta.addEventListener(ev, syncSelection));
  ta.addEventListener('focus', () => {
    if (S.sel && ta.selectionStart === ta.selectionEnd) {
      try {
        ta.setSelectionRange(S.sel[0], S.sel[1]);
      } catch {
        /* ignore */
      }
    }
  });

  $('#clear-text', container).addEventListener('click', () => {
    ta.value = '';
    S.passage = '';
    S.sel = null;
    hideFormError();
    renderCount();
    renderSelection();
    ta.focus();
  });

  $$('[data-sample]', container).forEach((b) =>
    b.addEventListener('click', () => {
      const sample = SAMPLES.find((s) => s.id === b.dataset.sample);
      if (!sample) return;
      ta.value = sample.text;
      S.passage = sample.text;
      S.sel = null;
      hideFormError();
      renderCount();
      renderSelection();
    })
  );

  $('#style', container).addEventListener('change', (e) => {
    S.style = e.target.value;
  });
  $('#generate', container).addEventListener('click', () => generate(false));

  renderCount();
  renderSelection();
  renderPanel();
  updateGenerateButton();

  return () => {
    root = null;
    ta = null;
    stopLoadingTimer();
  };
}

/* ---------- selection ---------- */

function syncSelection() {
  if (!ta) return;
  const s = ta.selectionStart;
  const e = ta.selectionEnd;
  S.sel = e > s && ta.value.slice(s, e).trim() ? [s, e] : null;
  renderSelection();
}

function getSource() {
  const full = ta ? ta.value : S.passage;
  if (S.sel) {
    const text = full.slice(S.sel[0], S.sel[1]).trim();
    if (text) return { text, isSelection: true };
  }
  return { text: full.trim(), isSelection: false };
}

function renderSelection() {
  const box = $('#selection');
  if (!box) return;
  const { text, isSelection } = getSource();
  if (isSelection) {
    box.className = 'selection has-selection';
    box.innerHTML = `
      <div class="selection-head">
        <span class="eyebrow">Illustrating your selection · ${wordCount(text)} words</span>
        <button type="button" class="link-btn" id="clear-selection">Use whole passage instead</button>
      </div>
      <p><mark>${esc(text)}</mark></p>`;
    $('#clear-selection').addEventListener('click', () => {
      if (ta) {
        const end = S.sel[1];
        ta.setSelectionRange(end, end);
      }
      S.sel = null;
      renderSelection();
    });
  } else if (text) {
    box.className = 'selection';
    box.innerHTML = `<p class="muted">Nothing highlighted, so Margination will illustrate the <strong>whole passage</strong>. Highlight a sentence to illustrate just that moment.</p>`;
  } else {
    box.className = 'selection';
    box.innerHTML = `<p class="muted">Start with a passage that caught your attention.</p>`;
  }
}

function renderCount() {
  const el = $('#count');
  if (!el || !ta) return;
  const chars = ta.value.length;
  const over = chars > MAX_PASSAGE_CHARS;
  el.textContent = `${wordCount(ta.value)} words · ${chars} / ${MAX_PASSAGE_CHARS} characters`;
  el.classList.toggle('over', over);
}

function showFormError(msg) {
  const el = $('#form-error');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
}
function hideFormError() {
  const el = $('#form-error');
  if (el) el.hidden = true;
}

function updateGenerateButton() {
  const btn = $('#generate');
  if (!btn) return;
  const busy = S.status === 'loading';
  btn.disabled = busy;
  btn.textContent = busy ? 'Illustrating…' : 'Illustrate';
}

/* ---------- generation ---------- */

async function generate(regen) {
  hideFormError();
  if (S.status === 'loading') return;

  let text;
  if (regen && S.current) {
    text = S.current.passage;
  } else {
    text = getSource().text;
  }

  if (!text) {
    showFormError('Start with a passage that caught your attention.');
    ta?.focus();
    return;
  }
  if (text.length > MAX_PASSAGE_CHARS) {
    showFormError(
      `That passage is a little long (limit: ${MAX_PASSAGE_CHARS} characters). Highlight just the scene you want to see.`
    );
    return;
  }

  lastWasRegen = Boolean(regen && S.current);
  S.variation = lastWasRegen ? S.variation + 1 : 0;
  const style = lastWasRegen ? S.current.style : S.style;
  const token = ++S.token;
  S.pending = { text, style };
  S.status = 'loading';
  S.error = null;
  renderPanel();
  updateGenerateButton();

  abortCtl = new AbortController();
  try {
    const data = await generateIllustration(
      { passage: text, style, variation: S.variation },
      { signal: abortCtl.signal }
    );
    if (token !== S.token) return;
    const blob = b64ToBlob(data.image, data.mimeType || 'image/png');
    if (S.current?.url) URL.revokeObjectURL(S.current.url);
    S.current = {
      blob,
      url: URL.createObjectURL(blob),
      passage: text,
      style,
      title: titleFrom(text),
      savedId: null,
      scene: data.scene?.summary || '',
    };
    S.status = 'ready';
  } catch (err) {
    if (token !== S.token) return;
    if (err?.name === 'AbortError') {
      S.status = S.current ? 'ready' : 'empty';
    } else {
      S.status = 'error';
      S.error = err;
    }
  } finally {
    if (token === S.token) abortCtl = null;
  }
  renderPanel();
  updateGenerateButton();
}

/* ---------- result panel ---------- */

function renderPanel() {
  const panel = $('#panel');
  if (!panel || !root) return;
  stopLoadingTimer();

  if (S.status === 'loading') return renderLoading(panel);
  if (S.status === 'error') return renderError(panel);
  if (S.status === 'ready' && S.current) return renderReady(panel);

  panel.innerHTML = `
    <div class="panel-empty">
      ${marge({ size: 120 })}
      <h2>Your illustration will appear here.</h2>
      <p>Highlight a sentence, press Illustrate, and watch the scene take shape beside your passage.</p>
    </div>`;
}

function renderLoading(panel) {
  panel.innerHTML = `
    <div class="panel-loading">
      <div class="spinner">${marge({ size: 120, className: 'twinkle' })}</div>
      <h2 id="loading-msg">${LOADING_MESSAGES[0]}</h2>
      <p class="muted">This usually takes 10 to 30 seconds.</p>
      <blockquote class="viewer-passage">${esc(S.pending?.text || '')}</blockquote>
      <button type="button" class="btn btn-quiet" id="cancel">Cancel</button>
    </div>`;
  let i = 0;
  loadingTimer = setInterval(() => {
    i = (i + 1) % LOADING_MESSAGES.length;
    const el = $('#loading-msg');
    if (el) el.textContent = LOADING_MESSAGES[i];
  }, 2800);
  $('#cancel').addEventListener('click', () => abortCtl?.abort());
}

function renderError(panel) {
  const message = S.error?.message || 'Something went wrong while imagining that passage. Please try again.';
  panel.innerHTML = `
    <div class="panel-empty panel-error" role="alert">
      ${pip({ size: 110 })}
      <h2>That one didn’t come out.</h2>
      <p>${esc(message)}</p>
      <div class="viewer-actions">
        <button type="button" class="btn btn-primary" id="retry">Try again</button>
        ${S.current ? '<button type="button" class="btn btn-secondary" id="keep-previous">Keep previous illustration</button>' : ''}
      </div>
    </div>`;
  $('#retry').addEventListener('click', () => generate(lastWasRegen));
  $('#keep-previous')?.addEventListener('click', () => {
    S.status = 'ready';
    renderPanel();
    updateGenerateButton();
  });
}

function renderReady(panel) {
  const c = S.current;
  const saved = Boolean(c.savedId);
  panel.innerHTML = `
    <div class="viewer">
      <div class="viewer-head">
        <span class="eyebrow">Illustration · ${esc(styleLabel(c.style))}</span>
        <button type="button" class="icon-btn" id="close-viewer" aria-label="Close illustration">×</button>
      </div>
      <figure class="viewer-art"><img src="${c.url}" alt="${esc('Illustration of: ' + titleFrom(c.passage))}" /></figure>
      <label class="title-field">
        <span>Title (optional)</span>
        <input id="title" type="text" maxlength="80" value="${esc(c.title)}" ${saved ? 'disabled' : ''} />
      </label>
      <blockquote class="viewer-passage">${esc(c.passage)}</blockquote>
      ${c.scene ? `<p class="scene-note"><strong>How Margination read it:</strong> ${esc(c.scene)}</p>` : ''}
      <div class="viewer-actions">
        <button type="button" class="btn btn-secondary" id="regen">Regenerate</button>
        <button type="button" class="btn btn-primary" id="save" ${saved ? 'disabled' : ''}>${saved ? 'Saved ✓' : 'Save to library'}</button>
        <button type="button" class="btn btn-secondary" id="download">Download</button>
      </div>
      ${saved ? '<p class="saved-note">Saved. <a href="#/library">Open your library</a></p>' : ''}
    </div>`;

  $('#title').addEventListener('input', (e) => {
    c.title = e.target.value;
  });
  $('#regen').addEventListener('click', () => generate(true));
  $('#save').addEventListener('click', save);
  $('#download').addEventListener('click', () => downloadBlob(c.blob, c.title || titleFrom(c.passage)));
  $('#close-viewer').addEventListener('click', closeViewer);
}

async function closeViewer() {
  const c = S.current;
  if (c && !c.savedId) {
    const ok = await confirmDialog({
      title: 'Close without saving?',
      message: 'This illustration hasn’t been saved to your library yet.',
      confirmLabel: 'Close anyway',
      cancelLabel: 'Go back',
    });
    if (!ok) return;
  }
  if (c?.url) URL.revokeObjectURL(c.url);
  S.current = null;
  S.status = 'empty';
  renderPanel();
  updateGenerateButton();
}

async function save() {
  const c = S.current;
  if (!c || c.savedId) return;
  const btn = $('#save');
  if (btn) btn.disabled = true;
  try {
    const record = {
      id: uid(),
      title: (c.title || '').trim() || titleFrom(c.passage),
      passage: c.passage,
      style: c.style,
      createdAt: Date.now(),
      mimeType: c.blob.type,
      blob: c.blob,
    };
    await addIllustration(record);
    c.savedId = record.id;
    c.title = record.title;
    toast('Saved to your visual library ✓', 'success');
  } catch (err) {
    console.error(err);
    toast('Margination couldn’t save this illustration in your browser. You can still download it.', 'error');
    if (btn) btn.disabled = false;
    return;
  }
  renderPanel();
}
