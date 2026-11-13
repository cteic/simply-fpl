import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Rasterises the SimplyFPL brand mark into the launcher/splash PNGs that
// app.json points at. Source of truth for the artwork is
// apps/web/public/brand/simplyfpl-mark-inverse.svg — the light-on-dark variant,
// which is what sits on the deep stadium teal background.
//
// Usage: node scripts/generate-app-assets.mjs
// Override the renderer with CHROME_BIN=/path/to/chrome if needed.

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, '..', 'assets');
const TMP_DIR = join(here, '..', '.asset-build');

const CHROME =
  process.env.CHROME_BIN ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const BRAND_DEEP = '#0B4F49';

// The mark's own viewBox is 0 0 64 64, but the artwork only spans x 11->64,
// y 7->50.75 within it. Re-centre on that bounding box (centre 37.5, 28.875)
// with a square 60-unit viewBox so the mark sits dead centre on a square canvas.
const MARK_SVG = `<svg viewBox="7.5 -1.125 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <line x1="40" y1="50" x2="63" y2="50" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="1.5" stroke-linecap="round" />
  <rect x="42" y="38" width="6" height="12" rx="1.5" fill="#2DD4BF" />
  <rect x="50" y="30" width="6" height="20" rx="1.5" fill="#5EEAD4" />
  <rect x="58" y="22" width="6" height="28" rx="1.5" fill="#99F6E4" />
  <path d="M16 18 L16 10 L20.5 15 L25 7 L29.5 15 L34 10 L34 18 Z" fill="#5EEAD4" />
  <rect x="14.5" y="17" width="21" height="4" rx="1.5" fill="#5EEAD4" />
  <circle cx="25" cy="36" r="14" fill="#FFFFFF" stroke="#0F766E" stroke-width="1.6" />
  <clipPath id="ball"><circle cx="25" cy="36" r="13.4" /></clipPath>
  <g clip-path="url(#ball)" fill="#0F766E">
    <polygon points="0,-4.3 4.09,-1.33 2.53,3.48 -2.53,3.48 -4.09,-1.33" transform="translate(25 36)" />
    <polygon points="0,-4.3 4.09,-1.33 2.53,3.48 -2.53,3.48 -4.09,-1.33" transform="translate(30.585 28.315) rotate(36)" />
    <polygon points="0,-4.3 4.09,-1.33 2.53,3.48 -2.53,3.48 -4.09,-1.33" transform="translate(34.035 38.936) rotate(108)" />
    <polygon points="0,-4.3 4.09,-1.33 2.53,3.48 -2.53,3.48 -4.09,-1.33" transform="translate(25 45.5) rotate(180)" />
    <polygon points="0,-4.3 4.09,-1.33 2.53,3.48 -2.53,3.48 -4.09,-1.33" transform="translate(15.965 38.936) rotate(252)" />
    <polygon points="0,-4.3 4.09,-1.33 2.53,3.48 -2.53,3.48 -4.09,-1.33" transform="translate(19.415 28.315) rotate(324)" />
  </g>
</svg>`;

const ASSETS = [
  // Store/iOS icon: opaque, mark at 76% so it survives the rounded-rect mask.
  { name: 'icon.png', size: 1024, background: BRAND_DEEP, markPercent: 76 },
  // Android adaptive foreground: transparent, artwork kept inside the inner
  // 66% safe zone that the launcher mask can crop to.
  { name: 'adaptive-icon.png', size: 1024, background: 'transparent', markPercent: 60 },
  // Splash: transparent, sits on app.json's splash.backgroundColor via `contain`.
  { name: 'splash.png', size: 1284, background: 'transparent', markPercent: 42 },
];

function page({ size, background, markPercent }) {
  return `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;padding:0}
    body{width:${size}px;height:${size}px;background:${background};
      display:flex;align-items:center;justify-content:center}
    svg{width:${markPercent}%;height:${markPercent}%;display:block}
  </style>${MARK_SVG}`;
}

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(TMP_DIR, { recursive: true });

for (const asset of ASSETS) {
  const html = join(TMP_DIR, `${asset.name}.html`);
  writeFileSync(html, page(asset));
  execFileSync(CHROME, [
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--default-background-color=00000000',
    `--window-size=${asset.size},${asset.size}`,
    `--screenshot=${join(OUT_DIR, asset.name)}`,
    `file://${html}`,
  ]);
  console.log(`wrote assets/${asset.name} (${asset.size}x${asset.size})`);
}

rmSync(TMP_DIR, { recursive: true, force: true });
