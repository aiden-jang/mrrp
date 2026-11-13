import { catArtwork, paintCatEyes } from "./catArt.js";
import { fill } from "./pixelArt.js";
import { POSES } from "./sprites.js";
import type { Cat } from "./types.js";

const INK = "#2c4135";
const head = catArtwork(POSES.sit)!.rows.map((row) => [...row]);
paintCatEyes(
  (x, y, width, height, color) => fill(head, x * 2, y * 2, width * 2, height * 2, color),
  "sit",
  -POSES.sit.ox,
  -POSES.sit.oy,
  { e: "e", w: "w", h: "h" },
  { awake: true, wink: false, gaze: 0 },
);
const HEAD = head.slice(0, 22);

export function iconMark(fur = "#e8963f", maskable = false, look?: Omit<Cat, "name">): string {
  const coat = /^#[\da-f]{6}$/i.test(fur) ? fur : "#e8963f";
  const palette: Record<string, string> = {
    w: "#4a3520",
    f: coat,
    d: look ? (look.tabby && /^#[\da-f]{6}$/i.test(look.furDk) ? look.furDk : coat) : "#c9752a",
    b: look && /^#[\da-f]{6}$/i.test(look.belly) ? look.belly : "#fbf0dd",
    p: "#e79ba3",
    n: "#e79ba3",
    m: "#4a3520",
    c: coat,
    h: "#fffdf6",
    e: look && /^#[\da-f]{6}$/i.test(look.eyes) ? look.eyes : "#7cb342",
  };
  const face = HEAD.flatMap((row, y) =>
    [...row].flatMap((pixel, x) =>
      palette[pixel]
        ? [`<rect x="${69 + x * 11}" y="${135 + y * 11}" width="11" height="11" fill="${palette[pixel]}"/>`]
        : [],
    ),
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="${maskable ? 0 : 120}" fill="${INK}"/><g shape-rendering="crispEdges"${maskable ? ' transform="translate(64 64) scale(.75)"' : ""}>${face}</g></svg>`;
}
