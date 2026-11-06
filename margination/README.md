# Margination

**SEE THE WORDS. STAY IN THE STORY.**

Margination is an AI-powered reading companion. Paste a passage, highlight the moment you want to see, and Margination draws it as a simple storybook illustration beside the original text. You can regenerate, save to a personal library, search it, and download images.

This repository is the **desktop website**. The browser extension and mobile app are future work (see [docs/EXTENSION.md](docs/EXTENSION.md)); neither is included yet.

## What works

- Landing page, reading workspace, visual library, illustration detail page, About & Settings
- Text input with word/character count, real text selection (highlight a sentence to illustrate just that)
- **Real AI image generation** through Google Gemini ("Nano Banana"), via a secure backend
- Three styles: Storybook, Minimal line art, Editorial, all sharing one Margination house style
- Regenerate (a new interpretation of the same passage), save, download (PNG/JPEG as returned)
- Personal library stored in your browser's IndexedDB: search, sort, open, download, delete. Survives refresh.
- Loading, empty and error states; friendly messages instead of raw errors
- Characters: Marge (green four-pointed star), Pip (orange fox), Lumi (blue elephant) as inline SVG

## Requirements

- **Node.js 18.17 or newer** (check with `node --version`). Download from https://nodejs.org
- A **Gemini API key** (free tier available): https://aistudio.google.com/apikey

There are **no npm dependencies**, so `npm install` is not needed.

## Setup and run

```bash
# 1. Create your config file
cp .env.example .env          # Windows (cmd): copy .env.example .env

# 2. Open .env and paste your key:
#    GEMINI_API_KEY=your_key_here

# 3. Start
npm start
```

Open **http://127.0.0.1:3000**.

If the key is missing, the site still loads, and the workspace tells you exactly what to configure when you try to illustrate.

### Run the tests

```bash
npm test
```

The tests start the server against a **mock** Gemini API, so they run offline and need no key. They verify: static files, path-traversal protection, validation, prompt building, character handling, error mapping, rate limiting setup and CORS. They do not prove your real key works. For that, generate one illustration.

## Configuration (`.env`)

| Variable | Default | Meaning |
|---|---|---|
| `GEMINI_API_KEY` | *(required)* | Your key. Stays on the server, never sent to the browser. |
| `GEMINI_IMAGE_MODEL` | `gemini-2.5-flash-image` | Image model. `gemini-3.1-flash-image-preview` is a newer option. |
| `GEMINI_TEXT_MODEL` | `gemini-2.5-flash` | Used to analyze the scene before drawing. |
| `INTERPRET_SCENE` | `true` | Set `false` to skip the analysis step (faster, one fewer API call). |
| `IMAGE_ASPECT_RATIO` | `4:3` | Blank lets the model decide. |
| `PORT`, `HOST` | `3000`, `127.0.0.1` | Server address. |
| `MAX_PASSAGE_CHARS` | `2000` | Max passage length. If you change it, also change `MAX_PASSAGE_CHARS` in `public/js/config.js`. |
| `RATE_LIMIT_PER_MINUTE` | `8` | Generations per minute per client. |
| `ALLOWED_ORIGINS`, `ALLOW_EXTENSION_ORIGINS` | empty / `false` | For the future extension (CORS). |

Model names change over time. If you see "image model was not found", check Google's current list at https://ai.google.dev/gemini-api/docs/image-generation and update `GEMINI_IMAGE_MODEL`.

## How an illustration is made

1. The browser sends `{ passage, style, variation }` to `POST /api/generate`.
2. The server validates and cleans the input (length, type, style).
3. **Scene analysis** (optional text model): extracts setting, subjects, actions, mood, lighting, framing, and how to interpret figurative language. If this step fails, generation continues with the passage alone.
4. **Prompt building** (`server/services/promptBuilder.js`): combines the Margination house style, the chosen style variant, the scene analysis, content-fidelity rules, and, only if the passage names them, the approved descriptions of Marge, Pip or Lumi. Regenerating changes `variation`, which adds a different framing instruction.
5. **Image provider** (`server/services/imageProvider.js`) calls Gemini and returns the image as base64.
6. The browser shows it next to the passage. Saving stores the image and passage in IndexedDB.

Passages are not stored or logged by the server.

## Project structure

```
margination/
├─ server/
│  ├─ server.js                 HTTP server, static files, /api routes, CORS, security headers
│  ├─ config.js                 .env loader + settings
│  ├─ validation.js             request cleaning/validation
│  ├─ rateLimit.js              in-memory limiter
│  ├─ errors.js                 user-safe error type
│  └─ services/
│     ├─ promptBuilder.js       house style + prompt assembly
│     ├─ sceneInterpreter.js    optional scene analysis
│     ├─ imageProvider.js       Gemini integration (swap this file for another provider)
│     └─ styles.js              illustration styles
├─ public/
│  ├─ index.html
│  ├─ css/styles.css            design tokens (palette variables) + layout
│  ├─ assets/favicon.svg
│  └─ js/
│     ├─ app.js                 header/footer + hash router
│     ├─ api.js                 backend client
│     ├─ db.js                  IndexedDB library
│     ├─ state.js, styles.js, config.js, utils.js, characters.js
│     └─ views/                 landing, workspace, library, detail, about
├─ tests/smoke.test.js
├─ docs/EXTENSION.md
├─ .env.example  .gitignore  package.json
```

## Limitations (stated honestly)

- Illustration quality, speed and cost depend on Google's service and your API quota. The free tier has limits; you may see "busy or usage limit reached".
- Character consistency in *generated* images relies on text descriptions of Marge, Pip and Lumi. No reference images are sent to the model, so their look in generated art can vary.
- The library is local to one browser on one computer. Clearing site data deletes it. There are no accounts or sync.
- The illustration on the landing page is a hand-drawn demonstration, labelled as such. It is not AI output.
- Fonts (Playfair Display, Inter) load from Google Fonts. Offline, the browser falls back to Georgia and system sans-serif.
- Tested: backend logic with a mock API (automated). The frontend was syntax-checked. You should run one real generation with your key before presenting.

## Troubleshooting

| Problem | Fix |
|---|---|
| "illustrator is not set up yet" | Add `GEMINI_API_KEY` to `.env`, restart `npm start`. |
| "rejected the API key" | Key is wrong, or the model isn't available to your account. |
| "image model was not found" | Update `GEMINI_IMAGE_MODEL`. |
| "busy or usage limit reached" | Wait a minute, or check your quota in Google AI Studio. |
| "could not draw this passage" | Google's safety filter declined it. Select a different part. |
| Library says it couldn't open | Private/incognito windows can block IndexedDB. Use a normal window. |
| Port in use | Change `PORT` in `.env`. |

## Deploying

Any Node host works (Render, Railway, Fly.io, a VPS). Set `GEMINI_API_KEY` as an environment variable on the host, `HOST=0.0.0.0`, and run `npm start`. Because there are no accounts, add your own protection (for example, a password or stricter `RATE_LIMIT_PER_MINUTE`) before making a public deployment, since anyone who can reach it spends your API quota.

## Putting it on GitHub

```bash
git init
git add .
git commit -m "Margination: desktop web app"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/margination.git
git push -u origin main
```

`.env` is in `.gitignore`, so your key is not uploaded. Double-check with `git status` that `.env` is not listed.
