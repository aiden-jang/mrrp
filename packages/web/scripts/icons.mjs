import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const modules = await createServer({
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: "custom",
});
const { iconMark } = await modules.ssrLoadModule("/src/iconMark.ts");
await modules.close();

const PUBLIC = resolve(dirname(fileURLToPath(import.meta.url)), "../public");
mkdirSync(PUBLIC, { recursive: true });
const svg = iconMark();
writeFileSync(resolve(PUBLIC, "icon.svg"), svg);
const square = svg.replace('rx="120"', 'rx="0"');
function render(name, source, width) {
  const png = new Resvg(source, {
    fitTo: { mode: "width", value: width },
    font: { fontFiles: [resolve(PUBLIC, "fonts/bricolage-latin.woff2")], loadSystemFonts: true },
  })
    .render()
    .asPng();
  writeFileSync(resolve(PUBLIC, name), png);
  console.log(`public/${name}`);
}
render("icon-512.png", square, 512);
render("icon-192.png", square, 192);
render("icon-maskable-512.png", iconMark(undefined, true), 512);
// iOS applies its own mask, so the source background must be opaque.
render("apple-touch-icon.png", square, 180);
render(
  "og.png",
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#e5e9de"/>
  <svg x="176" y="155" width="320" height="320" viewBox="0 0 512 512">${square.replace(/<svg[^>]*>|<\/svg>/g, "")}</svg>
  <g font-family="Bricolage Grotesque, sans-serif" fill="#2c4135">
    <text x="560" y="285" font-size="96" font-weight="700" letter-spacing="-2">mrrp</text>
    <text x="564" y="355" font-size="34" fill="#596b5d">One of you</text>
    <text x="564" y="401" font-size="34" fill="#596b5d">is the cat.</text>
  </g>
</svg>`,
  1200,
);
writeFileSync(
  resolve(PUBLIC, "manifest.webmanifest"),
  JSON.stringify(
    {
      name: "mrrp",
      short_name: "mrrp",
      description: "A tiny room for two. One of you is the cat.",
      start_url: ".",
      scope: "/",
      display: "standalone",
      background_color: "#e5e9de",
      theme_color: "#e5e9de",
      orientation: "portrait",
      screenshots: [
        {
          src: "/screenshots/app-desktop.png",
          sizes: "1440x900",
          type: "image/png",
          form_factor: "wide",
          label: "A little room to share.",
        },
        {
          src: "/screenshots/app-mobile.png",
          sizes: "390x844",
          type: "image/png",
          form_factor: "narrow",
          label: "Your cat, a note, and a moment together.",
        },
      ],
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
