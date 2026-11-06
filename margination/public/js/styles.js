// Illustration styles (ids must match server/services/styles.js)
export const STYLES = [
  { id: 'storybook', label: 'Storybook', desc: 'Soft, warm and expressive.' },
  { id: 'line', label: 'Minimal line art', desc: 'Clean outlines, few colours.' },
  { id: 'editorial', label: 'Editorial', desc: 'Bold, composed, a little more grown-up.' },
];

export const DEFAULT_STYLE = 'storybook';

export const styleLabel = (id) => STYLES.find((s) => s.id === id)?.label || 'Storybook';

const KEY = 'margination.settings.v1';

export function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { style: STYLES.some((s) => s.id === raw.style) ? raw.style : DEFAULT_STYLE };
  } catch {
    return { style: DEFAULT_STYLE };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* storage may be unavailable; the app still works for this session */
  }
}
