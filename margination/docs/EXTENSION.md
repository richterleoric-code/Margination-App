# Connecting a future browser extension

**Status: not built.** This repository contains no extension, no `manifest.json`, and nothing installable. This document explains how the existing backend is prepared so an extension can be added later without rewriting the AI logic.

## What is already in place

- A single, stable HTTP contract used by the website, which an extension can call as well:

  ```
  POST /api/generate
  Content-Type: application/json
  { "passage": "selected text", "style": "storybook|line|editorial", "variation": 0 }

  200 → { "image": "<base64>", "mimeType": "image/png", "style": "...", "scene": { "summary": "..." } | null }
  4xx/5xx → { "error": { "code": "...", "message": "<safe, user-facing text>" } }
  ```

  `variation` is `0` for the first image and increments for "regenerate".
- CORS is opt-in. In `.env`:
  - `ALLOW_EXTENSION_ORIGINS=true` allows any `chrome-extension://…` origin (use only while developing/shipping an extension).
  - `ALLOWED_ORIGINS=https://example.com` allows specific web origins.
- The API key stays on the server. The extension never sees it.
- Passage validation, prompt building and the Gemini call live only in `server/`, so the extension reuses them.
- The frontend's backend address is one constant: `API_BASE` in `public/js/config.js`.

## What the extension would need (to be written)

1. `manifest.json` (Manifest V3) with `host_permissions` for the Margination backend URL and a content script for web pages.
2. A **content script** that detects `window.getSelection()` text, shows a small Margination button beside the selection, and renders a floating panel (shadow DOM keeps page CSS out) with the image, the passage, Regenerate, Save, and Close. A small icon near the bottom-left opens the compact panel.
3. A **background service worker** that performs the `fetch` to `/api/generate` (service workers and extension pages are not blocked by the page's CSP) and returns the result to the content script via `chrome.runtime.sendMessage`.
4. A way to **save**. The extension has its own storage (`chrome.storage` / its own IndexedDB), separate from the website's library. Sharing one library across both would require either an account system or a deliberate export/import, neither of which exists today.

## Sketch (illustrative, untested)

```js
// background.js
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'illustrate') return;
  fetch('https://YOUR-MARGINATION-HOST/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passage: msg.text, style: msg.style, variation: msg.variation ?? 0 }),
  })
    .then((r) => r.json())
    .then(sendResponse)
    .catch(() => sendResponse({ error: { message: 'Could not reach Margination.' } }));
  return true; // keep the channel open for the async response
});
```

## Before shipping an extension

- Host the backend over HTTPS and add authentication or tighter rate limits (an extension makes your API quota publicly reachable).
- Decide what privacy wording applies when text from arbitrary web pages is sent for illustration.
- Test on real pages; many sites restrict injected UI or select text in unusual ways.
