// Node 24+ strips the shared TypeScript mark; Chrome renders the home-screen and preview PNGs.
import { iconMark } from "../src/iconMark.ts";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(HERE, "../public");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const svg = iconMark();
mkdirSync(PUBLIC, { recursive: true });
writeFileSync(resolve(PUBLIC, "icon.svg"), svg);

/** Render one HTML file to a PNG of the given size. */
function shoot(name, w, h, body) {
  const html = resolve(PUBLIC, `.${name}.html`);
  writeFileSync(
    html,
    `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;width:${w}px;height:${h}px;overflow:hidden}
  </style>${body}`,
  );
  try {
    execFileSync(
      CHROME,
      [
        "--headless",
        "--disable-gpu",
        "--hide-scrollbars",
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
  svg.replace('rx="120"', 'rx="0"').replace("<svg ", `<svg width="${size}" height="${size}" `);
const maskable = (size) =>
  iconMark(undefined, true).replace("<svg ", `<svg width="${size}" height="${size}" `);

shoot("icon-512.png", 512, 512, square(512));
shoot("icon-192.png", 192, 192, square(192));
shoot("icon-maskable-512.png", 512, 512, maskable(512));
// iOS applies its own mask, so home-screen icons use an opaque background.
shoot("apple-touch-icon.png", 180, 180, square(180));

// The link preview. This is the first thing she sees, before she has opened anything.
shoot(
  "og.png",
  1200,
  630,
  `<div style="width:1200px;height:630px;background:#f7ecdc;display:flex;align-items:center;
     justify-content:center;gap:64px;font-family:ui-sans-serif,system-ui,sans-serif">
     ${square(320)}
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
        { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      ],
    },
    null,
    2,
  ) + "\n",
);
console.log("public/manifest.webmanifest");
