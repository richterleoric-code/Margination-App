import { getConfig } from '../config.js';
import { AppError } from '../errors.js';

/**
 * Image-generation provider: Google Gemini ("Nano Banana") via the REST API.
 * To use another provider later, keep this signature:
 *   generateImage(prompt) -> { data: <base64 string>, mimeType: 'image/png' }
 */
export async function generateImage(prompt) {
  const cfg = getConfig();

  if (!cfg.apiKey) {
    throw new AppError(
      'not_configured',
      'Margination’s illustrator is not set up yet. Add a GEMINI_API_KEY to the .env file and restart the server.',
      503
    );
  }

  const url = `${cfg.apiBase}/models/${encodeURIComponent(cfg.imageModel)}:generateContent`;

  const attempt = async (withAspect) => {
    const generationConfig = { responseModalities: ['TEXT', 'IMAGE'] };
    if (withAspect && cfg.aspectRatio) generationConfig.imageConfig = { aspectRatio: cfg.aspectRatio };

    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig,
        }),
        signal: AbortSignal.timeout(120_000),
      });
    } catch (err) {
      if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
        throw new AppError('timeout', 'The illustration took too long. Please try again.', 504);
      }
      throw new AppError(
        'provider_unreachable',
        'Margination could not reach the illustration service. Check your connection and try again.',
        502
      );
    }
    return res;
  };

  let res = await attempt(true);

  // Some models reject imageConfig; retry once without it.
  if (res.status === 400 && cfg.aspectRatio) {
    const body = await res.clone().text();
    if (/imageConfig|aspect/i.test(body)) res = await attempt(false);
  }

  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.json())?.error?.message || '';
    } catch {
      /* ignore */
    }
    console.error(`[image provider] HTTP ${res.status} ${detail.slice(0, 200)}`);

    if (res.status === 429) {
      throw new AppError(
        'provider_rate_limited',
        'The illustration service is busy or the usage limit was reached. Please wait a moment and try again.',
        429
      );
    }
    if (res.status === 400 && /api key/i.test(detail)) {
      throw new AppError('provider_auth', 'The illustration service rejected the API key. Check GEMINI_API_KEY in .env.', 502);
    }
    if (res.status === 401 || res.status === 403) {
      throw new AppError(
        'provider_auth',
        'The illustration service rejected the API key or this model is not available for it. Check GEMINI_API_KEY and GEMINI_IMAGE_MODEL.',
        502
      );
    }
    if (res.status === 404) {
      throw new AppError(
        'provider_model',
        'The configured image model was not found. Check GEMINI_IMAGE_MODEL in .env.',
        502
      );
    }
    throw new AppError('provider_unavailable', 'The illustration service is unavailable right now. Please try again shortly.', 503);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new AppError('provider_bad_response', 'The illustration service sent an unexpected reply. Please try again.', 502);
  }

  if (data?.promptFeedback?.blockReason) {
    throw new AppError(
      'blocked',
      'The illustrator could not draw this passage. Try selecting a different part of the text.',
      422
    );
  }

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p) => (p.inlineData || p.inline_data)?.data);
  const inline = imagePart && (imagePart.inlineData || imagePart.inline_data);

  if (!inline) {
    const finish = data?.candidates?.[0]?.finishReason;
    if (finish && /SAFETY|IMAGE_SAFETY|PROHIBITED|BLOCK/i.test(finish)) {
      throw new AppError(
        'blocked',
        'The illustrator could not draw this passage. Try selecting a different part of the text.',
        422
      );
    }
    throw new AppError('no_image', 'The illustrator did not return a picture this time. Please try again.', 502);
  }

  return {
    data: inline.data,
    mimeType: inline.mimeType || inline.mime_type || 'image/png',
  };
}
