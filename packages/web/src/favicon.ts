import { HEAD } from "./sprites.js";
import type { Cat } from "./types.js";

const INK = "#4a3520";
const PINK = "#e79ba3";
const BLUSH = "#f0aeb4";
const WHITE = "#fffdf6";
const PAPER = "#f7ecdc";

// 4 device pixels per sprite pixel: a whole number, so no row of her comes out wider than another.
const SCALE = 4;

export function faviconFor(cat: Omit<Cat, "name">): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = HEAD.w * SCALE;
  canvas.height = HEAD.h * SCALE;
  const g = canvas.getContext("2d");
  if (!g) return null;

  // Opaque, not transparent. A dark browser theme behind her dark outline loses the whole shape.
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
