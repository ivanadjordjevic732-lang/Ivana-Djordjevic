// Erzeugt edle Platzhalter-Bilder (SVG) unter public/images/.
// Einfach durch echte Fotos ersetzen (gleicher Dateiname) oder Pfad in
// lib/data.js anpassen. Aufruf: node scripts/gen-placeholders.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'images');
mkdirSync(outDir, { recursive: true });

const cards = [
  ['gebiss', '1A Gebiss'],
  ['instrumente', 'Instrumente'],
  ['veneers', 'Veneers'],
  ['bohrer', 'Technologie'],
  ['spiegel', 'Diagnostik'],
  ['implantat', 'Implantate'],
  ['keramik', 'Keramikzahn'],
  ['digital', 'Digitale Zahnmedizin'],
];

const svg = (n, kicker) => `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="1024" viewBox="0 0 768 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1b1b20"/><stop offset="1" stop-color="#0b0b0d"/>
    </linearGradient>
    <radialGradient id="glow" cx="62%" cy="26%" r="80%">
      <stop offset="0" stop-color="#c9a24b" stop-opacity="0.22"/>
      <stop offset="0.5" stop-color="#c9a24b" stop-opacity="0.05"/>
      <stop offset="1" stop-color="#c9a24b" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="768" height="1024" fill="url(#bg)"/>
  <rect width="768" height="1024" fill="url(#glow)"/>
  <rect x="40" y="40" width="688" height="944" fill="none" stroke="#d8b978" stroke-opacity="0.5" stroke-width="2"/>
  <text x="384" y="512" text-anchor="middle" dominant-baseline="middle" font-family="Georgia, serif" font-weight="700" font-size="360" fill="#ede7db" fill-opacity="0.06">${String(n).padStart(2, '0')}</text>
  <text x="384" y="614" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="500" font-size="30" letter-spacing="4" fill="#d8b978">${kicker.toUpperCase()}</text>
  <text x="384" y="934" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="22" fill="#ede7db" fill-opacity="0.45">PLATZHALTER · BILD ERSETZEN</text>
</svg>
`;

cards.forEach(([id, kicker], i) => {
  writeFileSync(join(outDir, `${id}.svg`), svg(i + 1, kicker));
});

console.log(`Erzeugt: ${cards.length} Platzhalter in public/images/`);
