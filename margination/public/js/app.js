import { $, $$, esc } from './utils.js';
import { logoMark, marge } from './characters.js';
import { mountLanding } from './views/landing.js';
import { mountWorkspace } from './views/workspace.js';
import { mountLibrary } from './views/library.js';
import { mountDetail } from './views/detail.js';
import { mountAbout } from './views/about.js';

const NAV = [
  ['home', '#/', 'Home'],
  ['how', '#/how', 'How It Works'],
  ['about', '#/about', 'About'],
  ['workspace', '#/workspace', 'Workspace'],
  ['library', '#/library', 'Library'],
];

function renderChrome() {
  $('#site-header').innerHTML = `
    <div class="container header-inner">
      <a class="brand" href="#/" aria-label="Margination home">${logoMark(30)}<span>Margination</span></a>
      <nav class="main-nav" aria-label="Main">
        ${NAV.map(([id, href, label]) => `<a data-nav="${id}" href="${href}">${esc(label)}</a>`).join('')}
      </nav>
      <a class="btn btn-primary btn-sm" href="#/workspace">Get Started</a>
    </div>`;

  $('#site-footer').innerHTML = `
    <div class="container footer-inner">
      <div class="footer-brand">${logoMark(22)}<strong>Margination</strong></div>
      <p class="footer-tagline">SEE THE WORDS. STAY IN THE STORY.</p>
      <p class="footer-note">Your saved illustrations live only in this browser on this computer. Nothing is synced to the cloud.</p>
    </div>`;
}

function setActive(id) {
  $$('[data-nav]').forEach((a) => {
    if (a.dataset.nav === id) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

let cleanup = null;
let renderId = 0;

async function render() {
  const myId = ++renderId;
  if (typeof cleanup === 'function') {
    try {
      cleanup();
    } catch {
      /* ignore */
    }
  }
  cleanup = null;

  const app = $('#app');
  app.innerHTML = '';
  const parts = (location.hash.replace(/^#/, '') || '/').split('/').filter(Boolean);
  const [first, second] = parts;

  let navId = 'home';
  let result;
  let scrolled = false;

  try {
    if (!first) {
      result = mountLanding(app, {});
    } else if (first === 'how') {
      navId = 'how';
      scrolled = true;
      result = mountLanding(app, { scroll: 'how' });
    } else if (first === 'workspace') {
      navId = 'workspace';
      result = mountWorkspace(app);
    } else if (first === 'library' && second) {
      navId = 'library';
      result = await mountDetail(app, decodeURIComponent(second));
    } else if (first === 'library') {
      navId = 'library';
      result = await mountLibrary(app);
    } else if (first === 'about') {
      navId = 'about';
      result = await mountAbout(app);
    } else {
      navId = '';
      app.innerHTML = `
        <section class="container empty-page">
          ${marge({ size: 110, mood: 'think' })}
          <h1>That page wandered off.</h1>
          <p>We couldn’t find what you were looking for.</p>
          <a class="btn btn-primary" href="#/">Back to the start</a>
        </section>`;
    }
  } catch (err) {
    console.error(err);
    app.innerHTML = `
      <section class="container empty-page">
        ${marge({ size: 110, mood: 'think' })}
        <h1>Something went sideways.</h1>
        <p>This page couldn’t load. Please try again.</p>
        <button class="btn btn-primary" id="reload-page">Try again</button>
      </section>`;
    $('#reload-page')?.addEventListener('click', () => render());
  }

  if (myId !== renderId) {
    // A newer navigation started while this one was loading.
    if (typeof result === 'function') result();
    return;
  }
  cleanup = typeof result === 'function' ? result : null;
  setActive(navId);
  if (!scrolled) window.scrollTo(0, 0);
}

renderChrome();
window.addEventListener('hashchange', render);
render();
