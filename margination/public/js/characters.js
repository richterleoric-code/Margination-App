// Brand assets as inline SVG so there are no missing files.
// Marge: green four-pointed star, no limbs. Pip: orange fox. Lumi: blue elephant.

const INK = '#0F3D2E';
const STAR = 'M50 3 C55 36 64 45 97 50 C64 55 55 64 50 97 C45 64 36 55 3 50 C36 45 45 36 50 3Z';

export function logoMark(size = 28) {
  return `<svg class="logo-mark" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">
    <path d="${STAR}" fill="#E91E7C"/></svg>`;
}

export function marge({ size = 120, mood = 'happy', className = '' } = {}) {
  const mouth =
    mood === 'think'
      ? `<path d="M45 59 Q50 57 55 59" stroke="${INK}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`
      : `<path d="M43 56 Q50 64 57 56" stroke="${INK}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`;
  return `<svg class="character marge ${className}" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="Marge, a green four-pointed star">
    <path d="${STAR}" fill="#29C45A" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <ellipse cx="43" cy="47" rx="3" ry="4.2" fill="${INK}"/>
    <ellipse cx="57" cy="47" rx="3" ry="4.2" fill="${INK}"/>
    <circle cx="44" cy="45.6" r="1" fill="#fff"/><circle cx="58" cy="45.6" r="1" fill="#fff"/>
    <circle cx="38" cy="55" r="3" fill="#FF8FBF" opacity=".85"/><circle cx="62" cy="55" r="3" fill="#FF8FBF" opacity=".85"/>
    ${mouth}
  </svg>`;
}

export function pip({ size = 120, className = '' } = {}) {
  return `<svg class="character pip ${className}" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="Pip, a curious orange fox">
    <path d="M50 30 L78 14 L83 48 Q85 80 50 86 Q15 80 17 48 L22 14 Z" fill="#F28C28" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M26 24 L35 31 L27 40Z" fill="#FFB3D1"/><path d="M74 24 L65 31 L73 40Z" fill="#FFB3D1"/>
    <path d="M18 54 Q32 64 50 60 Q68 64 82 54 Q80 78 50 86 Q20 78 18 54Z" fill="#FFF1DD"/>
    <circle cx="38" cy="48" r="4" fill="${INK}"/><circle cx="62" cy="48" r="4" fill="${INK}"/>
    <circle cx="39.3" cy="46.7" r="1.3" fill="#fff"/><circle cx="63.3" cy="46.7" r="1.3" fill="#fff"/>
    <ellipse cx="50" cy="65" rx="4.5" ry="3.4" fill="${INK}"/>
    <path d="M44 72 Q50 77 56 72" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  </svg>`;
}

export function lumi({ size = 120, className = '' } = {}) {
  return `<svg class="character lumi ${className}" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="Lumi, a dreamy blue elephant">
    <circle cx="20" cy="50" r="18" fill="#9CC4F2" stroke="${INK}" stroke-width="3"/>
    <circle cx="80" cy="50" r="18" fill="#9CC4F2" stroke="${INK}" stroke-width="3"/>
    <circle cx="50" cy="48" r="28" fill="#5B9BE8" stroke="${INK}" stroke-width="3"/>
    <path d="M45 62 Q43 88 56 88 Q64 88 63 80" stroke="${INK}" stroke-width="13" fill="none" stroke-linecap="round"/>
    <path d="M45 62 Q43 88 56 88 Q64 88 63 80" stroke="#5B9BE8" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M36 44 Q40 49 44 44" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M56 44 Q60 49 64 44" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="34" cy="55" r="3" fill="#FF8FBF" opacity=".85"/><circle cx="66" cy="55" r="3" fill="#FF8FBF" opacity=".85"/>
    <path d="M86 12 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#E91E7C"/>
  </svg>`;
}

// A hand-drawn DEMONSTRATION scene for the landing page.
// It is labelled as an example in the UI and was NOT produced by the AI.
export function demoScene() {
  const rain = Array.from({ length: 22 }, (_, i) => {
    const x = 20 + i * 17;
    const y = 70 + ((i * 37) % 60);
    return `<line x1="${x}" y1="${y}" x2="${x - 8}" y2="${y + 22}"/>`;
  }).join('');
  return `<svg class="demo-scene" viewBox="0 0 400 300" role="img" aria-label="Example illustration: a small house on a cliff with glowing windows during a storm">
    <rect width="400" height="300" fill="#FFF8EE"/>
    <rect width="400" height="210" fill="#D9ECDD"/>
    <g fill="#8FB09E" stroke="${INK}" stroke-width="2.5">
      <path d="M-10 70 Q10 30 60 45 Q90 10 140 40 Q190 20 205 60 Q215 85 180 90 L-10 95Z"/>
      <path d="M190 55 Q220 15 275 35 Q320 5 365 40 Q415 45 410 85 L200 92 Q175 80 190 55Z"/>
    </g>
    <g stroke="#E91E7C" stroke-width="2.2" stroke-linecap="round" opacity=".7">${rain}</g>
    <path d="M-5 300 L-5 205 Q70 190 130 200 Q200 190 245 215 Q275 235 262 300Z" fill="#29C45A" stroke="${INK}" stroke-width="3"/>
    <path d="M262 300 Q290 250 330 262 Q380 275 410 252 L410 300Z" fill="#7FD79B" stroke="${INK}" stroke-width="3" opacity=".8"/>
    <path d="M150 198 L150 150 L205 150 L205 198Z" fill="#FFF8EE" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M140 152 L177.5 118 L215 152Z" fill="#E91E7C" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="193" y="122" width="9" height="20" fill="#FFE3EE" stroke="${INK}" stroke-width="2.5"/>
    <circle cx="165" cy="172" r="9" fill="#FFD36E" stroke="${INK}" stroke-width="2.5"/>
    <circle cx="165" cy="172" r="15" fill="#FFD36E" opacity=".3"/>
    <circle cx="190" cy="172" r="9" fill="#FFD36E" stroke="${INK}" stroke-width="2.5"/>
    <circle cx="190" cy="172" r="15" fill="#FFD36E" opacity=".3"/>
    <path d="M171 198 L171 186 Q177 181 183 186 L183 198Z" fill="${INK}"/>
  </svg>`;
}
