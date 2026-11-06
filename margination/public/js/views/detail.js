import { $, esc, formatDate, downloadBlob, toast, confirmDialog } from '../utils.js';
import { getIllustration, deleteIllustration } from '../db.js';
import { styleLabel } from '../styles.js';
import { pip } from '../characters.js';

export async function mountDetail(container, id) {
  let item;
  try {
    item = await getIllustration(id);
  } catch (err) {
    console.error(err);
    container.innerHTML = notFound('The library couldn’t open.', 'Your browser didn’t let Margination read its saved illustrations.');
    return;
  }
  if (!item) {
    container.innerHTML = notFound('We couldn’t find that illustration.', 'It may have been deleted.');
    return;
  }

  const url = URL.createObjectURL(item.blob);
  container.innerHTML = `
    <section class="container detail">
      <a class="back-link" href="#/library">← Back to library</a>
      <div class="detail-grid">
        <figure class="detail-art"><img src="${url}" alt="${esc('Illustration for ' + item.title)}" /></figure>
        <div class="detail-info">
          <p class="eyebrow">${esc(styleLabel(item.style))} · Saved ${esc(formatDate(item.createdAt))}</p>
          <h1>${esc(item.title)}</h1>
          <h2 class="small-head">Original passage</h2>
          <blockquote class="viewer-passage">${esc(item.passage)}</blockquote>
          <div class="viewer-actions">
            <button type="button" class="btn btn-primary" id="dl">Download</button>
            <button type="button" class="btn btn-danger-outline" id="del">Delete</button>
          </div>
        </div>
      </div>
    </section>`;

  $('#dl', container).addEventListener('click', () => downloadBlob(item.blob, item.title));
  $('#del', container).addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Delete this illustration?',
      message: `“${item.title}” will be removed from this browser. This can’t be undone.`,
    });
    if (!ok) return;
    try {
      await deleteIllustration(item.id);
    } catch {
      toast('That illustration couldn’t be deleted. Please try again.', 'error');
      return;
    }
    toast('Illustration deleted.');
    location.hash = '#/library';
  });

  return () => URL.revokeObjectURL(url);
}

function notFound(title, text) {
  return `
    <section class="container empty-page">
      ${pip({ size: 110 })}
      <h1>${esc(title)}</h1>
      <p>${esc(text)}</p>
      <a class="btn btn-primary" href="#/library">Back to library</a>
    </section>`;
}
