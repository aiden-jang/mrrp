import { HEAD } from "./sprites.js";
import type { Cat } from "./types.js";

/**
 * The tab icon, in her actual coat.
 *
 * The one in index.html is a ginger cat baked into an SVG, so a room with a black cat in it sat on
 * the home screen under somebody else's cat. This redraws the same head from the room's own colours
 * once the room has loaded, which is the only moment those colours are known.
 */

/** Room colours the sprite grid needs, matching the ones the canvas draws her with. */
const INK = "#4a3520";
const PINK = "#e79ba3";
const BLUSH = "#f0aeb4";
const WHITE = "#fffdf6";
const PAPER = "#f7ecdc";

/** 4 device pixels per sprite pixel: whole-numbered, and 64 is the largest size anything asks for.
 *  The grid carries its own margin, so it needs no padding to sit right in a tab. */
const SCALE = 4;

export function faviconFor(cat: Omit<Cat, "name">): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = HEAD.w * SCALE;
  canvas.height = HEAD.h * SCALE;
  const g = canvas.getContext("2d");
  if (!g) return null;

  // Opaque, not transparent: a dark browser theme behind a dark outline loses the whole silhouette.
  g.fillStyle = PAPER;
  g.fillRect(0, 0, canvas.width, canvas.height);

  const pal: Record<string, string> = {
    w: INK,
    f: cat.fur,
    d: cat.furDk,
    b: cat.belly,
    p: PINK,
    n: PINK,
    m: INK,
    c: BLUSH,
    h: WHITE,
    e: cat.eyes,
  };

  for (let y = 0; y < HEAD.h; y++) {
    const row = HEAD.rows[y]!;
    for (let x = 0; x < HEAD.w; x++) {
      const colour = pal[row[x]!];
      if (!colour) continue;
      g.fillStyle = colour;
      g.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
    }
  }
  return canvas.toDataURL("image/png");
}
