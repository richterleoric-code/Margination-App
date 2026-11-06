export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const wordCount = (t) => (t.trim().match(/\S+/g) || []).length;

export function slugify(text, max = 36) {
  const s = String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '');
  return s || 'illustration';
}

export function titleFrom(text) {
  const words = text.trim().replace(/\s+/g, ' ').split(' ');
  const head = words.slice(0, 7).join(' ').replace(/[.,;:!?"'“”]+$/, '');
  return words.length > 7 ? `${head}…` : head;
}

export function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function b64ToBlob(b64, mime = 'image/png') {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function extFor(mime) {
  if (/jpe?g/i.test(mime)) return 'jpg';
  if (/webp/i.test(mime)) return 'webp';
  return 'png';
}

export function downloadBlob(blob, title) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `margination-${slugify(title)}.${extFor(blob.type)}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function toast(message, type = 'info') {
  const host = $('#toasts');
  if (!host) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.setAttribute('role', type === 'error' ? 'alert' : 'status');
  t.textContent = message;
  host.appendChild(t);
  setTimeout(() => {
    t.classList.add('toast-out');
    setTimeout(() => t.remove(), 300);
  }, type === 'error' ? 5000 : 2800);
}

export function confirmDialog({ title, message, confirmLabel = 'Delete', cancelLabel = 'Keep it' }) {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'dialog';
    dlg.innerHTML = `
      <form method="dialog">
        <h2>${esc(title)}</h2>
        <p>${esc(message)}</p>
        <div class="dialog-actions">
          <button class="btn btn-quiet" value="cancel">${esc(cancelLabel)}</button>
          <button class="btn btn-danger" value="ok">${esc(confirmLabel)}</button>
        </div>
      </form>`;
    document.body.appendChild(dlg);
    dlg.addEventListener('close', () => {
      const ok = dlg.returnValue === 'ok';
      dlg.remove();
      resolve(ok);
    });
    dlg.showModal();
  });
}

export function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
