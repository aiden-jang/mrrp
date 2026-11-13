import type { Cat as CatLook } from "./types.js";
import { enlarge, fill, pixels, type PixelArt } from "./pixelArt.js";
import { POSES, TAIL, type Sprite } from "./sprites.js";

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
  for (const x of columns) fill(cells, x * 2, eyes * 2, 3, 3, "e");
  fill(cells, center * 2 - 1, nose * 2 + 1, 2, 1, "w");
  fill(cells, center * 2, nose * 2 + 2, 1, 1, "m");
  if (sprite === POSES.peek) {
    fill(cells, 0, 20, 4, 2, "b");
    fill(cells, 30, 20, 4, 2, "b");
  }
  if (sprite !== POSES.flop) {
    for (let y = (11 + shift) * 2; y < cells.length - 4; y++) {
      const half = Math.max(2, 6 - (y - (11 + shift) * 2) * 0.35);
      for (let x = 0; x < cells[y]!.length; x++) {
        if (cells[y]![x] === "b" && Math.abs(x - center * 2) > half) cells[y]![x] = "f";
      }
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
