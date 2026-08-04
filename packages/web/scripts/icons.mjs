/**
 * Generates the icons and the link preview from one authored grid.
 *
 *   node scripts/icons.mjs
 *
 * Deliberately NOT derived from the in-game sprite. A 24-wide loaf has stripes, whiskers and a mouth,
 * and all of that turns to mud at 32 pixels on a home screen. Icons need their own, chunkier drawing,
 * so this is a separate 16x16 face designed to survive being small.
 *
 * SVG is written for the browser tab; Chrome rasterises the PNGs, because iOS home screens and every
 * link-preview scraper want real bitmaps.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(HERE, "../public");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const P = {
  ".": null,
  w: "#4a3520", // outline
  f: "#e8963f", // fur
  d: "#c9752a", // fur, shaded
  b: "#fbf0dd", // muzzle
  e: "#7cb342", // eye
  h: "#fffdf6", // shine
  p: "#e79ba3", // ear, nose
};

/**
 * 16x16. Face only: at icon size the body is a brown lump.
 *
 * Eyes are 2x2 with the shine INSIDE them, set wide apart. My first pass put a 2-wide eye next to a
 * separate shine pixel, which merged at small sizes into a green bar and made her look like she was
 * wearing sunglasses. There is no mouth either: one dark row under the nose reads as a black bar.
 */
const FACE = [
  "..ww........ww..",
  ".wffw......wffw.",
  ".wfpfw....wfpfw.",
  ".wffffwwwwffffw.",
  "wffffffffffffffw",
  "wfffdffffffdfffw",
  "wfbbbbbbbbbbbbfw",
  "wfbehbbbbbbhebfw",
  "wfbeebbbbbbeebfw",
  "wfbbbbbppbbbbbfw",
  "wfbbbbbbbbbbbbfw",
  "wffbbbbbbbbbbffw",
  ".wfdffffffffdfw.",
  "..wffffffffffw..",
  "...wwwwwwwwww...",
  "................",
];

const N = 16;
for (const [i, row] of FACE.entries()) {
  if (row.length !== N) throw new Error(`icon row ${i} is ${row.length}, expected ${N}`);
}

/** The grid as SVG rects, at `cell` pixels each, offset by `ox`/`oy`. */
function rects(cell, ox = 0, oy = 0) {
  let out = "";
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const c = P[FACE[y][x]];
      if (c) out += `<rect x="${ox + x * cell}" y="${oy + y * cell}" width="${cell}" height="${cell}" fill="${c}"/>`;
    }
  }
  return out;
}

mkdirSync(PUBLIC, { recursive: true });

// Tab icon. 16 cells of 32 = 512, with the face inset so it isn't clipped by a rounded mask.
const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" shape-rendering="crispEdges">` +
  `<rect width="512" height="512" rx="96" fill="#f7ecdc"/>` +
  rects(28, 32, 40) +
  `</svg>`;
writeFileSync(resolve(PUBLIC, "icon.svg"), svg);

/** Render one HTML file to a PNG of the given size. */
function shoot(name, w, h, body) {
  const html = resolve(PUBLIC, `.${name}.html`);
  writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;width:${w}px;height:${h}px;overflow:hidden}
  </style>${body}`);
  try {
    execFileSync(
      CHROME,
      [
        "--headless", "--disable-gpu", "--hide-scrollbars",
        `--window-size=${w},${h}`,
        `--screenshot=${resolve(PUBLIC, name)}`,
        `file://${html}`,
      ],
      { stdio: "ignore" },
    );
  } finally {
    rmSync(html, { force: true });
  }
  console.log(`public/${name}  ${w}x${h}`);
}

const square = (size) =>
  `<div style="width:${size}px;height:${size}px;background:#f7ecdc">` +
  `<svg width="${size}" height="${size}" viewBox="0 0 512 512" shape-rendering="crispEdges">${rects(28, 32, 40)}</svg></div>`;

shoot("icon-512.png", 512, 512, square(512));
shoot("icon-192.png", 192, 192, square(192));
// iOS ignores transparency and applies its own mask, so this one keeps the warm background.
shoot("apple-touch-icon.png", 180, 180, square(180));

// The link preview. This is the first thing she sees, before she has opened anything.
shoot(
  "og.png",
  1200,
  630,
  `<div style="width:1200px;height:630px;background:#f7ecdc;display:flex;align-items:center;
     justify-content:center;gap:64px;font-family:ui-sans-serif,system-ui,sans-serif">
     <svg width="320" height="320" viewBox="0 0 512 512" shape-rendering="crispEdges">${rects(28, 32, 40)}</svg>
     <div>
       <div style="font-size:96px;font-weight:700;color:#4a3520;letter-spacing:-.02em">mrrp</div>
       <div style="font-size:34px;color:#7a6a54;margin-top:12px;max-width:15ch;line-height:1.35">
         Someone made you a cat.
       </div>
     </div>
   </div>`,
);

writeFileSync(
  resolve(PUBLIC, "manifest.webmanifest"),
  JSON.stringify(
    {
      name: "mrrp",
      short_name: "mrrp",
      description: "Someone made you a cat.",
      start_url: ".",
      scope: "/",
      display: "standalone",
      background_color: "#f7ecdc",
      theme_color: "#f7ecdc",
      orientation: "portrait",
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      ],
    },
    null,
    2,
  ) + "\n",
);
console.log("public/manifest.webmanifest");
