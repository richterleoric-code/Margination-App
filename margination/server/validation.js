import { AppError } from './errors.js';
import { STYLE_IDS, DEFAULT_STYLE } from './services/styles.js';
import { getConfig } from './config.js';

export function validateGenerateRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('bad_request', 'That request did not look right. Please try again.', 400);
  }

  const { maxPassageChars } = getConfig();

  if (typeof body.passage !== 'string') {
    throw new AppError('empty_passage', 'Start with a passage that caught your attention.', 400);
  }

  // Normalise whitespace but keep paragraph breaks.
  const passage = body.passage
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    // strip control characters except newline
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '')
    .trim();

  if (passage.length < 3) {
    throw new AppError('empty_passage', 'Start with a passage that caught your attention.', 400);
  }
  if (passage.length > maxPassageChars) {
    throw new AppError(
      'passage_too_long',
      `That passage is a little long (limit: ${maxPassageChars} characters). Select just the scene you want to see.`,
      400
    );
  }

  const style = STYLE_IDS.includes(body.style) ? body.style : DEFAULT_STYLE;

  let variation = Number.parseInt(body.variation, 10);
  if (!Number.isFinite(variation) || variation < 0) variation = 0;
  variation = Math.min(variation, 1000);

  return { passage, style, variation };
}
