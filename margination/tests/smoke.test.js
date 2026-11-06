import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

// 1x1 transparent PNG
const PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

let mock;
let mockUrl;
let app;
let base;
const seenImagePrompts = [];
let imageMode = 'ok'; // ok | blocked | noimage | http429 | http403

before(async () => {
  // Fake Gemini API so the whole backend flow can be tested offline.
  mock = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const json = (status, obj) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(obj));
      };
      if (req.headers['x-goog-api-key'] !== 'test-key') return json(403, { error: { message: 'bad key' } });

      if (req.url.includes('image-model')) {
        const parsed = JSON.parse(body);
        seenImagePrompts.push(parsed.contents[0].parts[0].text);
        if (imageMode === 'http429') return json(429, { error: { message: 'quota' } });
        if (imageMode === 'http403') return json(403, { error: { message: 'nope' } });
        if (imageMode === 'blocked') return json(200, { promptFeedback: { blockReason: 'SAFETY' } });
        if (imageMode === 'noimage')
          return json(200, { candidates: [{ content: { parts: [{ text: 'sorry' }] } }] });
        return json(200, {
          candidates: [{ content: { parts: [{ text: 'here' }, { inlineData: { mimeType: 'image/png', data: PNG_B64 } }] } }],
        });
      }
      // text model -> scene analysis
      return json(200, {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    summary: 'A small house on a cliff in a storm',
                    setting: 'cliff edge',
                    subjects: [],
                    actions: [],
                    objects: ['house'],
                    mood: 'moody but warm',
                    lighting: 'stormy, warm window light',
                    composition: 'house as focal point',
                    figurative: ['windows like lanterns: warmly lit windows'],
                  }),
                },
              ],
            },
          },
        ],
      });
    });
  });
  await new Promise((r) => mock.listen(0, '127.0.0.1', r));
  mockUrl = `http://127.0.0.1:${mock.address().port}/v1beta`;

  process.env.GEMINI_API_BASE = mockUrl;
  process.env.GEMINI_API_KEY = 'test-key';
  process.env.GEMINI_IMAGE_MODEL = 'image-model';
  process.env.GEMINI_TEXT_MODEL = 'text-model';
  process.env.RATE_LIMIT_PER_MINUTE = '100';
  process.env.MAX_PASSAGE_CHARS = '200';
  process.env.ALLOW_EXTENSION_ORIGINS = 'true';

  const { createApp } = await import('../server/server.js');
  app = createApp();
  await new Promise((r) => app.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.address().port}`;
});

after(() => {
  app?.close();
  mock?.close();
});

const post = (body, headers = {}) =>
  fetch(`${base}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

test('serves the website and assets', async () => {
  const html = await (await fetch(`${base}/`)).text();
  assert.match(html, /Margination/);
  for (const p of ['/css/styles.css', '/js/app.js', '/js/views/workspace.js', '/assets/favicon.svg']) {
    const r = await fetch(base + p);
    assert.equal(r.status, 200, p);
  }
});

test('blocks path traversal and unknown files', async () => {
  assert.equal((await fetch(`${base}/..%2Fpackage.json`)).status >= 400, true);
  assert.equal((await fetch(`${base}/%2e%2e/server/config.js`)).status >= 400, true);
  assert.equal((await fetch(`${base}/nope.js`)).status, 404);
});

test('health reports configuration without leaking the key', async () => {
  const data = await (await fetch(`${base}/api/health`)).json();
  assert.equal(data.configured, true);
  assert.equal(JSON.stringify(data).includes('test-key'), false);
});

test('generates an illustration end to end', async () => {
  imageMode = 'ok';
  const r = await post({ passage: 'The little house stood on the edge of the cliff.', style: 'storybook' });
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(data.image, PNG_B64);
  assert.equal(data.mimeType, 'image/png');
  const prompt = seenImagePrompts.at(-1);
  assert.match(prompt, /MARGINATION HOUSE STYLE/);
  assert.match(prompt, /little house stood on the edge/);
  assert.match(prompt, /SCENE ANALYSIS/);
  assert.doesNotMatch(prompt, /MARGE:/); // characters only when named
});

test('regenerate (variation) changes the prompt and style is applied', async () => {
  imageMode = 'ok';
  await post({ passage: 'A quiet garden.', style: 'line', variation: 0 });
  const first = seenImagePrompts.at(-1);
  await post({ passage: 'A quiet garden.', style: 'line', variation: 2 });
  const second = seenImagePrompts.at(-1);
  assert.match(first, /Minimal line art/);
  assert.notEqual(first, second);
});

test('named characters get their approved description', async () => {
  imageMode = 'ok';
  await post({ passage: 'Marge floated over the hills with Pip.' });
  const prompt = seenImagePrompts.at(-1);
  assert.match(prompt, /MARGE:/);
  assert.match(prompt, /PIP:/);
  assert.doesNotMatch(prompt, /LUMI:/);
});

test('validates input', async () => {
  let r = await post({ passage: '   ' });
  assert.equal(r.status, 400);
  assert.equal((await r.json()).error.code, 'empty_passage');

  r = await post({ passage: 'x'.repeat(500) });
  assert.equal(r.status, 400);
  assert.equal((await r.json()).error.code, 'passage_too_long');

  r = await post('not json');
  assert.equal(r.status, 400);

  r = await post({ passage: 123 });
  assert.equal(r.status, 400);
});

test('maps provider failures to friendly errors', async () => {
  imageMode = 'blocked';
  let r = await post({ passage: 'Something blocked.' });
  assert.equal(r.status, 422);
  assert.equal((await r.json()).error.code, 'blocked');

  imageMode = 'noimage';
  r = await post({ passage: 'Text only reply.' });
  assert.equal((await r.json()).error.code, 'no_image');

  imageMode = 'http429';
  r = await post({ passage: 'Too busy.' });
  assert.equal(r.status, 429);
  assert.equal((await r.json()).error.code, 'provider_rate_limited');

  imageMode = 'http403';
  r = await post({ passage: 'Auth problem.' });
  assert.equal((await r.json()).error.code, 'provider_auth');
  imageMode = 'ok';
});

test('reports a clear error when no API key is configured', async () => {
  const saved = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = '';
  const r = await post({ passage: 'A passage without a key.' });
  assert.equal(r.status, 503);
  assert.equal((await r.json()).error.code, 'not_configured');
  process.env.GEMINI_API_KEY = saved;
});

test('CORS: extension origins allowed only when enabled; others are not', async () => {
  let r = await fetch(`${base}/api/health`, { headers: { Origin: 'chrome-extension://abcdef' } });
  assert.equal(r.headers.get('access-control-allow-origin'), 'chrome-extension://abcdef');
  r = await fetch(`${base}/api/health`, { headers: { Origin: 'https://evil.example' } });
  assert.equal(r.headers.get('access-control-allow-origin'), null);
  r = await fetch(`${base}/api/generate`, {
    method: 'OPTIONS',
    headers: { Origin: 'chrome-extension://abcdef' },
  });
  assert.equal(r.status, 204);
});
