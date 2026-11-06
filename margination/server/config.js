import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');

// Tiny .env loader (no dependencies). Real environment variables win.
function loadEnvFile() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let value = m[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}
loadEnvFile();

const bool = (v, fallback) =>
  v === undefined || v === '' ? fallback : ['1', 'true', 'yes'].includes(String(v).toLowerCase());
const int = (v, fallback) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

// Read lazily so tests can change process.env.
export function getConfig() {
  const e = process.env;
  return {
    port: int(e.PORT, 3000),
    host: e.HOST || '127.0.0.1',
    apiKey: (e.GEMINI_API_KEY || '').trim(),
    apiBase: (e.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, ''),
    imageModel: e.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image',
    textModel: e.GEMINI_TEXT_MODEL || 'gemini-2.5-flash',
    interpretScene: bool(e.INTERPRET_SCENE, true),
    aspectRatio: (e.IMAGE_ASPECT_RATIO ?? '4:3').trim(),
    maxPassageChars: int(e.MAX_PASSAGE_CHARS, 2000),
    rateLimitPerMinute: int(e.RATE_LIMIT_PER_MINUTE, 8),
    allowedOrigins: (e.ALLOWED_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    allowExtensionOrigins: bool(e.ALLOW_EXTENSION_ORIGINS, false),
    trustProxy: bool(e.TRUST_PROXY, false),
  };
}
