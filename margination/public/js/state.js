import { loadSettings } from './styles.js';

// Original demonstration passages (not from any published book).
export const SAMPLES = [
  {
    id: 'river',
    label: 'A landscape',
    text: 'The river glimmered like a silver ribbon beneath the morning sun, winding lazily through the green countryside.',
  },
  {
    id: 'house',
    label: 'A house',
    text: 'The little house stood on the edge of the cliff, its windows glowing like small lanterns against the storm.',
  },
  {
    id: 'garden',
    label: 'A garden',
    text: 'The garden was alive with color, and every flower seemed to hold a secret.',
  },
];

// Workspace state lives here so it survives switching pages.
export const workspace = {
  passage: '',
  sel: null, // [start, end] or null
  style: loadSettings().style,
  status: 'empty', // empty | loading | ready | error
  error: null,
  current: null, // { blob, url, mimeType, passage, style, title, savedId, scene }
  variation: 0,
  token: 0,
};
