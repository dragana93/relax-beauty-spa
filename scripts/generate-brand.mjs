// Generates the logo files in public/brand from open-source (OFL) fonts.
// Text is converted to vector paths, so the SVGs render without any font installed.
// Usage: npm run brand  [-- --script=allura]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import opentype from 'opentype.js';
import sharp from 'sharp';

const SCRIPT_FONT =
  process.argv.find((a) => a.startsWith('--script='))?.split('=')[1] ?? 'great-vibes';
const OUT = process.argv.find((a) => a.startsWith('--out='))?.split('=')[1] ?? 'public/brand';
const IVORY = '#F3ECE1';

/** Fontsource splits fonts by subset; "ć" lives in latin-ext. */
function loadFont(name) {
  return ['latin', 'latin-ext'].map((subset) => {
    const file = readFileSync(
      `node_modules/@fontsource/${name}/files/${name}-${subset}-400-normal.woff`,
    );
    return opentype.parse(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
  });
}

// opentype.js 2.0 toPathData() emits NaN for coordinates very close to zero.
function serialize(commands) {
  const n = (v) => Math.round(v * 100) / 100;
  return commands
    .map((c) => {
      const points = [
        [c.x1, c.y1],
        [c.x2, c.y2],
        [c.x, c.y],
      ].filter(([x]) => x !== undefined);
      return c.type + points.map(([x, y]) => `${n(x)} ${n(y)}`).join(' ');
    })
    .join('');
}

/** Lays out text glyph by glyph and returns path data plus its bounding box. */
function textPath(fonts, text, size, spacing = 0) {
  let x = 0;
  let previous;
  let d = '';
  const box = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
  for (const char of text) {
    const font = fonts.find((f) => f.charToGlyphIndex(char) > 0);
    if (!font) throw new Error(`No glyph for "${char}"`);
    const glyph = font.charToGlyph(char);
    const scale = size / font.unitsPerEm;
    if (previous?.font === font) x += font.getKerningValue(previous.glyph, glyph) * scale;
    const path = glyph.getPath(x, 0, size);
    d += serialize(path.commands);
    if (char !== ' ') {
      const b = path.getBoundingBox();
      box.x1 = Math.min(box.x1, b.x1);
      box.y1 = Math.min(box.y1, b.y1);
      box.x2 = Math.max(box.x2, b.x2);
      box.y2 = Math.max(box.y2, b.y2);
    }
    x += glyph.advanceWidth * scale + spacing;
    previous = { font, glyph };
  }
  return { d, box };
}

/** Places text centred on cx, scaled to an exact width, with its baseline at y. */
function placed(path, cx, baseline, width) {
  const scale = width / (path.box.x2 - path.box.x1);
  const tx = cx - ((path.box.x1 + path.box.x2) / 2) * scale;
  return {
    svg: `<path transform="translate(${tx.toFixed(2)} ${baseline}) scale(${scale.toFixed(4)})" d="${path.d}"/>`,
    left: cx - width / 2,
    right: cx + width / 2,
  };
}

const script = loadFont(SCRIPT_FONT);
const caps = loadFont('marcellus');
const name = textPath(script, 'Dijana Savanović', 200);
const tagline = textPath(caps, 'RELAX, BEAUTY AND SPA STUDIO', 40, 8);

/** Lotus drawn around (0,0) at the base of the petals; 200 units wide. */
const LOTUS = `
  <g fill="none" stroke="url(#gold)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M0 0C-24-22-26-58 0-88C26-58 24-22 0 0Z"/>
    <path d="M-3 0C-38-6-60-30-62-64C-34-58-12-36-3 0Z"/>
    <path d="M3 0C38-6 60-30 62-64C34-58 12-36 3 0Z"/>
    <path d="M-10 4C-38 16-68 6-82-23C-54-30-27-21-10 4"/>
    <path d="M10 4C38 16 68 6 82-23C54-30 27-21 10 4"/>
  </g>`;

function gradient(x1, y1, x2, y2) {
  return `<linearGradient id="gold" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">
    <stop offset="0" stop-color="#8A6428"/><stop offset=".3" stop-color="#B68D45"/>
    <stop offset=".46" stop-color="#CFAD68"/><stop offset=".62" stop-color="#8F6B2C"/>
    <stop offset=".82" stop-color="#A98239"/><stop offset="1" stop-color="#765620"/>
  </linearGradient>`;
}

function svg(viewBox, label, defs, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${label}">
<defs>${defs}</defs>
${body}
</svg>
`;
}

const LABEL = 'Dijana Savanović – Relax, Beauty and Spa Studio';

// Full logo. Coordinates follow the proportions of the reference image.
const mainName = placed(name, 708, 553, 1000);
const mainTagline = placed(tagline, 711, 694, 820);
const full = svg(
  '24 108 1370 848',
  LABEL,
  gradient(150, 150, 1250, 900),
  `<g fill="url(#gold)">
  <!-- ring: two tapered arcs -->
  <path d="M364 353C428 211 558 124 706 123C905 123 1052 280 1061 466L1051 466C1035 289 894 132 706 133C564 134 442 220 374 357Z"/>
  <path d="M364 723C430 856 560 940 708 941C856 941 976 856 1042 723L1032 719C962 843 850 928 708 929C568 928 452 846 374 719Z"/>
  <!-- swashes either side of the name -->
  <path d="M38 506C42 482 72 470 112 472C152 474 180 490 222 485C186 502 150 485 112 482C78 480 54 488 44 507Z"/>
  <path d="M1376 508C1372 532 1336 538 1296 528C1262 520 1236 514 ${(mainName.right - 6).toFixed(0)} 536C1236 502 1266 508 1299 517C1334 527 1362 526 1370 507Z"/>
  ${mainName.svg}
  ${mainTagline.svg}
  <rect x="154" y="676" width="${(mainTagline.left - 34 - 154).toFixed(0)}" height="3" rx="1.5"/>
  <rect x="${(mainTagline.right + 34).toFixed(0)}" y="676" width="${(1250 - mainTagline.right - 34).toFixed(0)}" height="3" rx="1.5"/>
</g>
<g fill="none" stroke="url(#gold)" stroke-width="2.4" stroke-linecap="round">
  <path d="M470 768C550 768 590 776 622 788"/>
  <path d="M936 768C856 768 816 776 784 788"/>
</g>
<g transform="translate(703 813)">${LOTUS}</g>`,
);

// Compact header logo: lotus beside the name and a short descriptor.
const compactName = placed(name, 460, 88, 540);
const compactTagline = placed(tagline, 460, 146, 536);
const compact = svg(
  '0 0 740 164',
  LABEL,
  gradient(0, 0, 740, 164),
  `<g transform="translate(90 120)">${LOTUS}</g>
<g fill="url(#gold)">${compactName.svg}</g>
<g fill="#7A5A22">${compactTagline.svg}</g>`,
);

// Square mark: ring and lotus, used for favicons.
const mark = svg(
  '0 0 240 240',
  LABEL,
  gradient(20, 20, 220, 220),
  `<rect width="240" height="240" rx="52" fill="${IVORY}"/>
<g fill="none" stroke="url(#gold)" stroke-width="5" stroke-linecap="round">
  <path d="M37 86A90 90 0 0 1 203 86"/>
  <path d="M203 154A90 90 0 0 1 37 154"/>
</g>
<g transform="translate(120 155) scale(.98)">${LOTUS}</g>`,
);

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/logo-full.svg`, full);
writeFileSync(`${OUT}/logo-compact.svg`, compact);
writeFileSync(`${OUT}/logo-mark.svg`, mark);

const render = (source, width) =>
  sharp(Buffer.from(source), { density: 200 }).resize({ width }).png().toBuffer();

// PNG versions for email clients, home-screen icons and social previews.
writeFileSync(`${OUT}/logo-email.png`, await render(full, 600));
// Heavier lines keep the mark visible at tab-icon size.
writeFileSync(
  `${OUT}/favicon-32.png`,
  await render(
    mark
      .replace('stroke-width="3.2"', 'stroke-width="8"')
      .replace('stroke-width="5"', 'stroke-width="11"'),
    32,
  ),
);
writeFileSync(`${OUT}/apple-touch-icon.png`, await render(mark, 180));
await sharp({ create: { width: 1200, height: 630, channels: 4, background: IVORY } })
  .composite([{ input: await render(full, 900), gravity: 'centre' }])
  .png()
  .toFile(`${OUT}/og-image.png`);

console.log(`Brand files written to ${OUT} (script font: ${SCRIPT_FONT})`);
