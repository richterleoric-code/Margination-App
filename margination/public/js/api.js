import { API_BASE } from './config.js';

export class ApiError extends Error {
  constructor(code, message, status = 0) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** Ask the backend to illustrate a passage. Resolves with { image (base64), mimeType, style, scene }. */
export async function generateIllustration({ passage, style, variation }, { signal } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passage, style, variation }),
      signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new ApiError(
      'network',
      'Margination could not reach its server. Check that it is running and your connection is working, then try again.'
    );
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* not JSON */
  }

  if (!res.ok || !data?.image) {
    throw new ApiError(
      data?.error?.code || 'unknown',
      data?.error?.message || 'Something went wrong while imagining that passage. Please try again.',
      res.status
    );
  }
  return data;
}

export async function getStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
