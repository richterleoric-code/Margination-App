import { $$ } from '../utils.js';
import { marge, pip, lumi, demoScene } from '../characters.js';
import { SAMPLES, workspace } from '../state.js';

export function mountLanding(container, { scroll } = {}) {
  container.innerHTML = `
    <section class="hero container">
      <div class="hero-copy">
        <p class="eyebrow">An AI reading companion</p>
        <h1>See the words.<br /><span class="hl">Stay in the story.</span></h1>
        <p class="lede">Margination turns selected passages into simple, beautiful illustrations, helping you imagine more and enjoy the journey.</p>
        <div class="hero-actions">
          <a class="btn btn-primary btn-lg" href="#/workspace">Start illustrating</a>
          <a class="btn btn-secondary btn-lg" href="#/how">See how it works</a>
        </div>
        <p class="fineprint">No account needed. Your library stays in your browser.</p>
      </div>

      <div class="hero-preview" aria-label="Example of Margination turning a passage into an illustration">
        <div class="preview-passage">
          <p>Nobody had visited the headland in years. <mark>The little house stood on the edge of the cliff, its windows glowing like small lanterns against the storm.</mark> Inside, someone had left the kettle on.</p>
          <span class="preview-tag">Selected passage</span>
        </div>
        <figure class="preview-art">
          ${demoScene()}
          <figcaption>Demonstration only: hand-drawn for this page, not generated from your text.</figcaption>
        </figure>
        <div class="preview-marge">${marge({ size: 84 })}</div>
      </div>
    </section>

    <section class="section" id="how">
      <div class="container">
        <p class="eyebrow">How it works</p>
        <h2>Four small steps from words to picture.</h2>
        <ol class="steps">
          <li><span class="step-n">1</span><h3>Select a passage</h3><p>Paste or type some text, then highlight the exact moment you want to see.</p></li>
          <li><span class="step-n">2</span><h3>Generate an illustration</h3><p>Margination reads the scene and draws it in its own storybook style.</p></li>
          <li><span class="step-n">3</span><h3>Explore the scene</h3><p>Keep the passage beside the picture. Not quite right? Imagine it again.</p></li>
          <li><span class="step-n">4</span><h3>Save your favorites</h3><p>Build a personal visual bookshelf you can search, download and revisit.</p></li>
        </ol>
      </div>
    </section>

    <section class="band-dark">
      <div class="container">
        <p class="eyebrow eyebrow-light">Why Margination?</p>
        <h2>Reading, with a little help from imagination.</h2>
        <div class="why-grid">
          <div><h3>Visualize the unseen</h3><p>Descriptions become something you can actually look at.</p></div>
          <div><h3>Make reading approachable</h3><p>A picture is a friendly doorway back into a page.</p></div>
          <div><h3>Explore unfamiliar descriptions</h3><p>New words and faraway places get visual context.</p></div>
          <div><h3>Read at your own pace</h3><p>An optional companion, never a replacement for the words.</p></div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <p class="eyebrow">Meet the characters</p>
        <h2>Three companions for the margins.</h2>
        <div class="characters">
          <article class="char">
            ${marge({ size: 150 })}
            <h3>Marge</h3><p class="char-role">The Guide</p>
            <p>A calm, encouraging four-pointed star who keeps the reader company and is always ready to help imagine.</p>
          </article>
          <article class="char">
            ${pip({ size: 150 })}
            <h3>Pip</h3><p class="char-role">The Curious Reader</p>
            <p>A sharp-eyed fox who asks questions, notices small details and loves to explore a passage.</p>
          </article>
          <article class="char">
            ${lumi({ size: 150 })}
            <h3>Lumi</h3><p class="char-role">The Daydreamer</p>
            <p>A dreamy elephant who brings mood and atmosphere to the worlds readers build in their minds.</p>
          </article>
        </div>
      </div>
    </section>

    <section class="section section-tint">
      <div class="container">
        <p class="eyebrow">Try it</p>
        <h2>Start with a sample passage.</h2>
        <p class="lede">These short passages were written as demonstrations. Pick one to load it into the workspace.</p>
        <ul class="sample-list">
          ${SAMPLES.map(
            (s) => `<li>
              <div><span class="sample-label">${s.label}</span><p>${s.text}</p></div>
              <button class="btn btn-secondary" data-sample="${s.id}">Open in workspace</button>
            </li>`
          ).join('')}
        </ul>
      </div>
    </section>

    <section class="closing container">
      ${marge({ size: 110 })}
      <h2>Ready to see what you’re reading?</h2>
      <p class="lede">Bring a passage. Margination will bring the picture.</p>
      <a class="btn btn-primary btn-lg" href="#/workspace">Try Margination</a>
    </section>`;

  $$('[data-sample]', container).forEach((btn) =>
    btn.addEventListener('click', () => {
      const sample = SAMPLES.find((s) => s.id === btn.dataset.sample);
      if (!sample) return;
      workspace.passage = sample.text;
      workspace.sel = null;
      location.hash = '#/workspace';
    })
  );

  if (scroll) {
    requestAnimationFrame(() => {
      document.getElementById(scroll)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}
