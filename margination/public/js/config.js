// Where the Margination backend lives.
// '' means "same origin as this page" (the default when you run `npm start`).
// A future browser extension can reuse the same backend by pointing this at
// e.g. 'http://localhost:3000' (and enabling ALLOW_EXTENSION_ORIGINS on the server).
export const API_BASE = '';

export const MAX_PASSAGE_CHARS = 2000; // keep in sync with MAX_PASSAGE_CHARS in .env
