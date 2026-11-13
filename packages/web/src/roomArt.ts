import {
  BED,
  SHELF,
  WINDOW,
  MUG,
  MUG_DOWN,
  PLANT,
  FRAME,
  FRAME_EMPTY,
  BOX_BACK,
  BOX_FRONT,
  DOOR_FRAMES,
  BIRD,
  type Sprite,
} from "./sprites.js";
import { enlarge, fill, grid, pixels, type PixelArt } from "./pixelArt.js";
import { catArtwork } from "./catArt.js";

const cache = new Map<Sprite, PixelArt>();

function windowArt() {
  const cells = grid(51, 33);
  fill(cells, 0, 0, 51, 33, "h");
  for (const x of [0, 24, 48]) {
    fill(cells, x, 0, 3, 33, "f");
    fill(cells, x, 0, 1, 33, "b");
    fill(cells, x + 2, 0, 1, 33, "d");
  }
  for (const y of [0, 15, 30]) {
    fill(cells, 0, y, 51, 3, "f");
    fill(cells, 0, y, 51, 1, "b");
    fill(cells, 0, y + 2, 51, 1, "d");
  }
  fill(cells, 0, 0, 1, 33, "w");
  fill(cells, 50, 0, 1, 33, "w");
  fill(cells, 0, 32, 51, 1, "w");
  return pixels(cells, 1 / 3);
}

function cabinetArt() {
  const cells = grid(36, 16);
  fill(cells, 0, 0, 36, 14, "w");
  fill(cells, 1, 1, 33, 12, "d");
  fill(cells, 1, 1, 33, 1, "f");
  fill(cells, 33, 2, 2, 11, "c");
  fill(cells, 2, 4, 15, 8, "w");
  fill(cells, 3, 6, 3, 6, "p");
  fill(cells, 7, 5, 4, 7, "g");
  fill(cells, 12, 7, 3, 5, "b");
  fill(cells, 4, 7, 1, 4, "h");
  fill(cells, 8, 6, 1, 5, "f");
  fill(cells, 20, 4, 11, 8, "c");
  fill(cells, 21, 5, 9, 6, "d");
  fill(cells, 22, 8, 1, 2, "h");
  fill(cells, 1, 13, 33, 1, "c");
  fill(cells, 2, 14, 4, 2, "w");
  fill(cells, 29, 14, 4, 2, "w");
  return pixels(cells, 0.5);
}

function mugArt(down: boolean) {
  const cells = grid(down ? 16 : 12, down ? 8 : 10);
  if (down) {
    fill(cells, 4, 0, 8, 1, "w");
    fill(cells, 2, 1, 12, 6, "w");
    fill(cells, 3, 2, 10, 4, "c");
    fill(cells, 4, 1, 7, 1, "b");
    fill(cells, 4, 2, 1, 3, "h");
    fill(cells, 3, 5, 10, 1, "d");
    fill(cells, 1, 2, 3, 4, "w");
    fill(cells, 2, 3, 1, 2, ".");
    fill(cells, 4, 7, 8, 1, "w");
  } else {
    fill(cells, 2, 0, 7, 1, "w");
    fill(cells, 1, 1, 9, 8, "w");
    fill(cells, 2, 1, 7, 7, "c");
    fill(cells, 2, 1, 7, 1, "b");
    fill(cells, 3, 2, 1, 5, "h");
    fill(cells, 7, 2, 2, 6, "d");
    fill(cells, 2, 8, 7, 1, "w");
    fill(cells, 9, 2, 3, 5, "w");
    fill(cells, 10, 3, 1, 3, ".");
  }
  return pixels(cells, 0.5);
}

function bedArt() {
  const cells = grid(40, 16);
  const spans = [
    [9, 30],
    [6, 33],
    [3, 36],
    [2, 37],
    [1, 38],
    [0, 39],
    [0, 39],
    [0, 39],
    [0, 39],
    [1, 38],
    [2, 37],
    [3, 36],
    [5, 34],
    [7, 32],
    [10, 29],
    [13, 26],
  ] as const;
  spans.forEach(([left, right], y) => {
    fill(cells, left, y, right - left + 1, 1, y > 10 ? "w" : "d");
    if (y > 1 && y < 12) fill(cells, left + 2, y, right - left - 3, 1, "f");
    if (y > 3 && y < 10) fill(cells, left + 5, y, right - left - 9, 1, "b");
  });
  fill(cells, 10, 1, 20, 1, "h");
  for (const x of [8, 14, 25, 31]) fill(cells, x, 10, 1, 2, "d");
  return pixels(cells, 0.5, BED.ox, BED.oy);
}

function plantArt() {
  const cells = grid(32, 40);
  fill(cells, 16, 12, 1, 18, "s");
  for (const [x, y, width] of [
    [6, 3, 8],
    [16, 0, 8],
    [21, 7, 9],
    [1, 13, 9],
    [10, 10, 10],
    [19, 16, 10],
    [5, 20, 8],
    [15, 22, 8],
  ] as const) {
    fill(cells, x + 2, y, width - 4, 1, "g");
    fill(cells, x + 1, y + 1, width - 2, 1, "g");
    fill(cells, x, y + 2, width, 2, "g");
    fill(cells, x + 1, y + 4, width - 2, 1, "s");
    fill(cells, x + 2, y + 1, 2, 1, "l");
  }
  fill(cells, 10, 28, 14, 2, "w");
  fill(cells, 11, 28, 12, 1, "f");
  fill(cells, 11, 30, 12, 7, "d");
  fill(cells, 11, 30, 1, 6, "w");
  fill(cells, 22, 30, 1, 6, "c");
  fill(cells, 13, 31, 2, 5, "f");
  fill(cells, 12, 37, 10, 2, "c");
  fill(cells, 13, 39, 8, 1, "w");
  return pixels(cells, 0.5, -3, -7);
}

function birdArt() {
  const cells = grid(15, 15);
  for (const [row, left, right] of [
    [2, 6, 8],
    [3, 5, 9],
    [4, 4, 10],
    [5, 3, 11],
    [6, 3, 11],
    [7, 3, 11],
    [8, 3, 11],
    [9, 3, 11],
    [10, 4, 10],
    [11, 5, 9],
  ] as const) {
    fill(cells, left, row, right - left + 1, 1, "w");
    if (right - left > 2) fill(cells, left + 1, row, right - left - 1, 1, "b");
  }
  fill(cells, 9, 4, 1, 1, "w");
  fill(cells, 11, 6, 3, 2, "o");
  fill(cells, 5, 7, 2, 3, "w");
  fill(cells, 6, 12, 1, 2, "w");
  fill(cells, 9, 12, 1, 2, "w");
  return pixels(cells, 1 / 3);
}

function outlined(sprite: Sprite) {
  const cells = enlarge(sprite);
  const original = cells.map((row) => [...row]);
  for (let y = 1; y < cells.length - 1; y++) {
    for (let x = 1; x < cells[y]!.length - 1; x++) {
      if (original[y]![x] !== "w") continue;
      const inside = [original[y]![x + 1], original[y + 1]![x]].find((c) => c !== "w" && c !== ".");
      if (inside) cells[y]![x] = inside;
    }
  }
  return pixels(cells, 0.5, sprite.ox, sprite.oy);
}

export function roomArt(sprite: Sprite): PixelArt {
  const saved = cache.get(sprite);
  if (saved) return saved;
  const art =
    catArtwork(sprite) ??
    (sprite === WINDOW
      ? windowArt()
      : sprite === SHELF
        ? cabinetArt()
        : sprite === MUG
          ? mugArt(false)
          : sprite === MUG_DOWN
            ? mugArt(true)
            : sprite === BED
              ? bedArt()
              : sprite === PLANT
                ? plantArt()
                : sprite === BIRD
                  ? birdArt()
                  : [FRAME, FRAME_EMPTY, BOX_BACK, BOX_FRONT, ...DOOR_FRAMES].includes(sprite)
                    ? outlined(sprite)
                    : { rows: sprite.rows, step: 1, ox: sprite.ox, oy: sprite.oy });
  cache.set(sprite, art);
  return art;
}
