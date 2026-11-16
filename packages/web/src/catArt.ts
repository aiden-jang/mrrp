import type { Cat as CatLook } from "./types.js";
import { enlarge, fill, pixels, type PixelArt } from "./pixelArt.js";
import { POSES, TAIL, type Pose, type Sprite } from "./sprites.js";
import { eyeHighlights } from "./overlays.js";

const cats = new Set(Object.values(POSES));

export function catArtwork(sprite: Sprite): PixelArt | null {
  if (!cats.has(sprite) && sprite !== TAIL) return null;
  const cells = enlarge(sprite);
  const original = cells.map((row) => [...row]);
  for (let y = 0; y < cells.length; y++) {
    for (let x = 0; x < cells[y]!.length; x++) {
      if (original[y]![x] !== "w") continue;
      const inside = [original[y]?.[x + 1], original[y + 1]?.[x]].find((c) => c && c !== "w" && c !== ".");
      if (inside) cells[y]![x] = inside;
    }
  }
  if (sprite === TAIL) {
    fill(cells, 5, 4, 2, 3, "d");
    return pixels(cells, 0.5, sprite.ox, sprite.oy);
  }
  const nose = sprite.rows.findIndex((row) => row.includes("nn"));
  const shift = nose - 8;
  const center = sprite.rows[nose]!.indexOf("nn") + 1;
  const top = shift * 2;
  const left = center * 2 - 16;
  fill(cells, 0, 0, Math.min(sprite.w * 2, 36), (11 + shift) * 2, ".");
  const shape = [
    [4, 7],
    [25, 28],
    [3, 9],
    [23, 29],
    [3, 11],
    [21, 29],
    [2, 13],
    [19, 30],
    [2, 30],
    [2, 30],
    [1, 31],
    [1, 31],
    [0, 32],
    [0, 32],
    [0, 32],
    [0, 32],
    [0, 32],
    [0, 32],
    [1, 31],
    [1, 31],
    [2, 30],
    [2, 30],
    [3, 29],
    [4, 28],
    [6, 26],
    [9, 23],
  ];
  shape.forEach(([start, end], row) => {
    const y = row < 8 ? Math.floor(row / 2) : row - 4;
    const edge = Math.max(2, start!);
    fill(cells, left + edge, top + y, Math.min(30, end!) - edge + 1, 1, "w");
  });
  for (let y = top + 1; y < top + 21; y++) {
    for (let x = left; x < left + 33; x++) {
      if (cells[y]?.[x] !== "w") continue;
      if (
        [cells[y - 1]?.[x], cells[y + 1]?.[x], cells[y]?.[x - 1], cells[y]?.[x + 1]].every(
          (c) => c && c !== ".",
        )
      )
        cells[y]![x] = "f";
    }
  }
  fill(cells, left + 5, top + 2, 2, 2, "p");
  fill(cells, left + 25, top + 2, 2, 2, "p");
  for (const x of [left + 10, left + 16, left + 22]) fill(cells, x, top + 5, 2, 3, "d");
  for (let row = 0; row < 6; row++)
    fill(cells, left + 5 + Math.abs(2 - row), top + 14 + row, 23 - Math.abs(2 - row) * 2, 1, "b");
  const eyes = sprite.rows.findIndex((row) => row.includes("h"));
  const columns = [...sprite.rows[eyes]!].flatMap((cell, x) => (cell === "h" ? [x] : []));
  for (const x of columns) fill(cells, x * 2, eyes * 2, 3, 3, "f");
  fill(cells, center * 2 - 1, nose * 2 + 1, 2, 1, "w");
  fill(cells, center * 2, nose * 2 + 2, 1, 1, "m");
  if (sprite === POSES.peek) {
    fill(cells, 0, 20, 4, 2, "b");
    fill(cells, 30, 20, 4, 2, "b");
  }
  // Quiet poses carry their weight low; the same head and face landmarks sit above every body.
  if ([POSES.sit, POSES.perk, POSES.loaf].includes(sprite)) {
    const start = (11 + shift) * 2;
    const end = cells.length - 4;
    for (let y = start; y < end; y++) {
      const progress = (y - start) / Math.max(1, end - start - 1);
      const bodyCenter = center * 2 + (sprite === POSES.loaf ? Math.round(progress * 3) : 0);
      const half = Math.round(12 + Math.sin((progress * Math.PI) / 2) * 4);
      fill(cells, 0, y, cells[y]!.length, 1, ".");
      fill(cells, bodyCenter - half, y, half * 2 + 1, 1, "w");
      fill(cells, bodyCenter - half + 1, y, half * 2 - 1, 1, "f");
      fill(cells, bodyCenter + half - 2, y, 2, 1, "d");
      const bib = Math.round(8 - progress * 4);
      fill(cells, bodyCenter - bib, y, bib * 2, 1, "b");
    }
  }
  fill(cells, center * 2 - 1, nose * 2, 2, 1, "n");
  for (const x of [left + 5, left + 26]) fill(cells, x, top + 14, 2, 1, "p");
  if (sprite !== POSES.flop) {
    for (let y = (11 + shift) * 2; y < cells.length - 4; y++) {
      const half = Math.max(2, 6 - (y - (11 + shift) * 2) * 0.35);
      for (let x = 0; x < cells[y]!.length; x++) {
        if (cells[y]![x] === "b" && Math.abs(x - center * 2) > half) cells[y]![x] = "f";
      }
    }
  }
  if ([POSES.sit, POSES.perk, POSES.loaf].includes(sprite)) {
    for (const x of [center * 2 - 6, center * 2 + 6]) {
      fill(cells, x - 2, cells.length - 5, 6, 3, "w");
      fill(cells, x - 1, cells.length - 5, 4, 2, "b");
      fill(cells, x + 1, cells.length - 4, 1, 1, "d");
    }
  }
  return pixels(cells, 0.5, sprite.ox, sprite.oy);
}

export function catPalette(look: CatLook, awake: boolean, light: (color: string) => string) {
  const belly = light(look.belly);
  return {
    w: "#4a3520",
    f: light(look.fur),
    d: light(look.furDk),
    b: belly,
    p: "#e79ba3",
    n: "#e79ba3",
    m: "#4a3520",
    c: light(look.fur),
    h: awake ? "#fffdf6" : light(look.fur),
    e: awake ? look.eyes : light(look.fur),
  };
}

export function paintCatEyes(
  paint: (x: number, y: number, width: number, height: number, color: string) => void,
  pose: Pose,
  x: number,
  y: number,
  palette: { e: string; w: string; h: string },
  expression: { awake: boolean; wink: boolean; gaze: number; crossed?: boolean },
) {
  const spot = eyeHighlights(pose);
  const top = y + POSES[pose].oy + spot.row - 1;
  for (const [side, col] of [spot.l, spot.r].entries()) {
    const gaze = expression.crossed ? (side === 0 ? 1 : -1) : expression.gaze;
    const left = x + col - 1.5;
    if (!expression.awake || (expression.wink && side === 1)) {
      paint(left + 0.5, top + 1.5, 2, 0.5, palette.w);
      paint(left, top + 2, 0.5, 0.5, palette.w);
      paint(left + 2.5, top + 2, 0.5, 0.5, palette.w);
      continue;
    }
    paint(left + 1, top, 1, 0.5, palette.e);
    paint(left + 0.5, top + 0.5, 2, 0.5, palette.e);
    paint(left, top + 1, 3, 1, palette.e);
    paint(left + 0.5, top + 2, 2, 0.5, palette.e);
    paint(left + 1, top + 2.5, 1, 0.5, palette.e);
    paint(left + 1 + gaze * 0.5, top + 0.5, 1, 2, palette.w);
    paint(left + 0.5 + gaze * 0.5, top + 1, 2, 1, palette.w);
    paint(left + 1, top + 0.5, 0.5, 0.5, palette.h);
    paint(left + 1.5, top + 2, 0.5, 0.5, palette.h);
  }
}
