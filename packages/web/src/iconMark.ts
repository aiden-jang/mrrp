import { catArtwork } from "./catArt.js";
import { POSES } from "./sprites.js";
import type { Cat } from "./types.js";

const INK = "#2c4135";
const HEAD = catArtwork(POSES.sit)!.rows.slice(0, 22);

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
    h: coat,
    e: "#4a3520",
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
