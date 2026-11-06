import { $, $$, esc, formatDate, downloadBlob, toast, confirmDialog } from '../utils.js';
import { getAllIllustrations, deleteIllustration } from '../db.js';
import { styleLabel } from '../styles.js';
import { marge, pip } from '../characters.js';

export async function mountLibrary(container) {
  container.innerHTML = `
    <section class="container library">
      <header class="lib-head">
        <div>
          <p class="eyebrow">Your visual bookshelf</p>
          <h1>Library</h1>
        </div>
        <a class="btn btn-primary" href="#/workspace">New illustration</a>
      </header>
      <div id="lib-body"><p class="muted">Opening your bookshelf…</p></div>
    </section>`;

  const body = $('#lib-body', container);
  let items;
  try {
    items = await getAllIllustrations();
  } catch (err) {
    console.error(err);
    body.innerHTML = `
      <div class="panel-empty panel-error" role="alert">
        ${pip({ size: 110 })}
        <h2>The library couldn’t open.</h2>
        <p>Your browser didn’t let Margination read its saved illustrations. Private browsing windows often block this.</p>
        <button class="btn btn-primary" id="lib-retry">Try again</button>
      </div>`;
    $('#lib-retry', container).addEventListener('click', () => mountLibrary(container));
    return;
  }

  // Thumbnail URLs live as long as this page does.
  const urls = new Map();
  for (const it of items) urls.set(it.id, URL.createObjectURL(it.blob));

  let query = '';
  let sort = 'newest';

  function visible() {
    const q = query.trim().toLowerCase();
    let list = items.filter((it) => !q || `${it.title} ${it.passage}`.toLowerCase().includes(q));
    if (sort === 'newest') list.sort((a, b) => b.createdAt - a.createdAt);
    if (sort === 'oldest') list.sort((a, b) => a.createdAt - b.createdAt);
    if (sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }

  function renderGrid() {
    const grid = $('#lib-grid', container);
    const count = $('#lib-count', container);
    const list = visible();
    count.textContent = `${list.length} of ${items.length} illustration${items.length === 1 ? '' : 's'}`;

    if (!list.length) {
      grid.className = 'lib-empty';
      grid.innerHTML = `
        ${pip({ size: 100 })}
        <h2>No illustrations found.</h2>
        <p>Try another search.</p>`;
      return;
    }
    grid.className = 'lib-grid';
    grid.innerHTML = list
      .map(
        (it) => `
        <article class="tile" data-id="${esc(it.id)}">
          <a class="tile-link" href="#/library/${encodeURIComponent(it.id)}">
            <div class="tile-img"><img src="${urls.get(it.id)}" alt="${esc('Illustration for ' + it.title)}" loading="lazy" /></div>
            <h3>${esc(it.title)}</h3>
          </a>
          <p class="tile-passage">${esc(it.passage)}</p>
          <div class="tile-foot">
            <span class="muted">${esc(formatDate(it.createdAt))} · ${esc(styleLabel(it.style))}</span>
            <span class="tile-actions">
              <button type="button" class="link-btn" data-dl>Download</button>
              <button type="button" class="link-btn danger" data-del>Delete</button>
            </span>
          </div>
        </article>`
      )
      .join('');

    $$('.tile', grid).forEach((tile) => {
      const it = items.find((x) => x.id === tile.dataset.id);
      $('[data-dl]', tile).addEventListener('click', () => downloadBlob(it.blob, it.title));
      $('[data-del]', tile).addEventListener('click', async () => {
        const ok = await confirmDialog({
          title: 'Delete this illustration?',
          message: `“${it.title}” will be removed from this browser. This can’t be undone.`,
        });
        if (!ok) return;
        try {
          await deleteIllustration(it.id);
        } catch {
          toast('That illustration couldn’t be deleted. Please try again.', 'error');
          return;
        }
        items = items.filter((x) => x.id !== it.id);
        URL.revokeObjectURL(urls.get(it.id));
        urls.delete(it.id);
        toast('Illustration deleted.');
        if (!items.length) renderShell();
        else renderGrid();
      });
    });
  }

  function renderShell() {
    if (!items.length) {
      body.innerHTML = `
        <div class="panel-empty lib-first">
          ${marge({ size: 130 })}
          <h2>Your visual bookshelf is waiting for its first story.</h2>
          <p>Illustrate a passage and press “Save to library”. It will appear here and stay in this browser.</p>
          <a class="btn btn-primary" href="#/workspace">Illustrate a passage</a>
        </div>`;
      return;
    }
    body.innerHTML = `
      <div class="lib-tools">
        <label class="sr-only" for="lib-search">Search illustrations</label>
        <input id="lib-search" type="search" placeholder="Search by title or passage" value="${esc(query)}" />
        <label class="style-pick"><span>Sort</span>
          <select id="lib-sort">
            <option value="newest">Recently saved</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Title A to Z</option>
          </select>
        </label>
        <span id="lib-count" class="muted"></span>
      </div>
      <div id="lib-grid"></div>`;
    $('#lib-sort', container).value = sort;
    $('#lib-search', container).addEventListener('input', (e) => {
      query = e.target.value;
      renderGrid();
    });
    $('#lib-sort', container).addEventListener('change', (e) => {
      sort = e.target.value;
      renderGrid();
    });
    renderGrid();
  }

  renderShell();

  return () => {
    for (const u of urls.values()) URL.revokeObjectURL(u);
    urls.clear();
  };
}
