import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { ROOT, getConfig } from './config.js';
import { AppError } from './errors.js';
import { validateGenerateRequest } from './validation.js';
import { createRateLimiter } from './rateLimit.js';
import { interpretScene } from './services/sceneInterpreter.js';
import { buildImagePrompt } from './services/promptBuilder.js';
import { generateImage } from './services/imageProvider.js';

const PUBLIC_DIR = path.join(ROOT, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join('; ');

function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': CSP,
  };
}

// CORS: same-origin always works. Extra origins (and a future Chrome extension) are opt-in.
function corsHeaders(req) {
  const origin = req.headers.origin;
  if (!origin) return {};
  const cfg = getConfig();
  const ok =
    cfg.allowedOrigins.includes(origin) ||
    (cfg.allowExtensionOrigins && origin.startsWith('chrome-extension://'));
  if (!ok) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

function sendJson(res, status, body, extra = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...securityHeaders(),
    ...extra,
  });
  res.end(payload);
}

function readJson(req, limit = 16 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooBig = false;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        tooBig = true;
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooBig) {
        return reject(new AppError('payload_too_large', 'That passage is too large to send. Try a shorter selection.', 413));
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(new AppError('bad_request', 'That request did not look right. Please try again.', 400));
      }
    });
    req.on('error', () => reject(new AppError('bad_request', 'The request was interrupted.', 400)));
  });
}

const limiter = createRateLimiter();

function clientKey(req) {
  const cfg = getConfig();
  if (cfg.trustProxy) {
    const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (fwd) return fwd;
  }
  return req.socket.remoteAddress || 'unknown';
}

async function handleGenerate(req, res, cors) {
  const cfg = getConfig();

  const rl = limiter(clientKey(req), cfg.rateLimitPerMinute);
  if (!rl.allowed) {
    throw new AppError(
      'rate_limited',
      `You are illustrating quickly! Please wait ${rl.retryAfter} seconds and try again.`,
      429
    );
  }

  const body = await readJson(req);
  const input = validateGenerateRequest(body);

  // 1) interpret the passage (optional, fails soft)  2) build prompt  3) generate
  const scene = await interpretScene(input.passage);
  const prompt = buildImagePrompt({ ...input, scene });
  const image = await generateImage(prompt);

  // Passages are never stored or logged on the server.
  sendJson(
    res,
    200,
    {
      image: image.data,
      mimeType: image.mimeType,
      style: input.style,
      scene: scene ? { summary: scene.summary } : null,
    },
    cors
  );
}

async function serveStatic(req, res) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400, securityHeaders());
    return res.end('Bad request');
  }
  if (pathname.endsWith('/')) pathname += 'index.html';

  const filePath = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (filePath !== PUBLIC_DIR && !filePath.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403, securityHeaders());
    return res.end('Forbidden');
  }

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) throw new Error('not a file');
    const data = await fs.readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      ...securityHeaders(),
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...securityHeaders() });
    res.end('Not found');
  }
}

export function createApp() {
  return http.createServer(async (req, res) => {
    const cors = corsHeaders(req);
    const { pathname } = new URL(req.url, 'http://localhost');

    try {
      if (pathname.startsWith('/api/')) {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, { ...cors, ...securityHeaders() });
          return res.end();
        }

        if (pathname === '/api/health' && req.method === 'GET') {
          const cfg = getConfig();
          return sendJson(
            res,
            200,
            {
              ok: true,
              configured: Boolean(cfg.apiKey),
              imageModel: cfg.imageModel,
              sceneInterpretation: cfg.interpretScene,
              maxPassageChars: cfg.maxPassageChars,
            },
            cors
          );
        }

        if (pathname === '/api/generate' && req.method === 'POST') {
          return await handleGenerate(req, res, cors);
        }

        return sendJson(res, 404, { error: { code: 'not_found', message: 'Not found.' } }, cors);
      }

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, securityHeaders());
        return res.end('Method not allowed');
      }
      return await serveStatic(req, res);
    } catch (err) {
      if (err instanceof AppError) {
        return sendJson(res, err.status, { error: { code: err.code, message: err.message } }, cors);
      }
      console.error('[server] unexpected error:', err?.message || err);
      return sendJson(
        res,
        500,
        { error: { code: 'server_error', message: 'Something went wrong on our side. Please try again.' } },
        cors
      );
    }
  });
}

// Start only when run directly (not when imported by tests).
const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const cfg = getConfig();
  createApp().listen(cfg.port, cfg.host, () => {
    console.log(`\n  Margination is running:  http://${cfg.host === '0.0.0.0' ? 'localhost' : cfg.host}:${cfg.port}`);
    if (!cfg.apiKey) {
      console.log('  ⚠  GEMINI_API_KEY is not set. Copy .env.example to .env and add your key to generate illustrations.\n');
    } else {
      console.log(`  Image model: ${cfg.imageModel}\n`);
    }
  });
}
