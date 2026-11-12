import type { Sprite } from "./sprites.js";

export interface PixelArt {
  rows: string[];
  step: number;
  ox: number;
  oy: number;
}

export const grid = (width: number, height: number) =>
  Array.from({ length: height }, () => Array<string>(width).fill("."));

export function fill(cells: string[][], x: number, y: number, width: number, height: number, color: string) {
  for (let row = y; row < y + height; row++) {
    for (let col = x; col < x + width; col++) {
      if (cells[row]?.[col] !== undefined) cells[row]![col] = color;
    }
  }
}

export function pixels(cells: string[][], step: number, ox = 0, oy = 0): PixelArt {
  return { rows: cells.map((row) => row.join("")), step, ox, oy };
}

export function enlarge(sprite: Sprite, density = 2): string[][] {
  return sprite.rows.flatMap((row) =>
    Array.from({ length: density }, () => [...row].flatMap((cell) => Array<string>(density).fill(cell))),
  );
}
