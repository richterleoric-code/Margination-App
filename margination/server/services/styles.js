// Illustration styles. Every style keeps the Margination identity; they only
// change how the house style is expressed.
export const STYLES = {
  storybook: {
    label: 'Storybook',
    direction:
      'STYLE VARIANT — Storybook: soft, warm, expressive storybook artwork. Slightly textured colour fills like gouache or colored pencil, rounded friendly shapes, gentle light, cosy atmosphere.',
  },
  line: {
    label: 'Minimal line art',
    direction:
      'STYLE VARIANT — Minimal line art: clean continuous outlines, very simplified forms, mostly flat fills, only two or three accent colours from the palette, lots of empty cream space, uncluttered.',
  },
  editorial: {
    label: 'Editorial',
    direction:
      'STYLE VARIANT — Editorial illustration: contemporary magazine-cover composition, bold simplified shapes, confident colour blocking, subtle paper grain, a more mature and thoughtful character.',
  },
};

export const STYLE_IDS = Object.keys(STYLES);
export const DEFAULT_STYLE = 'storybook';
