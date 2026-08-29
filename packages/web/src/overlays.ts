/*
 * Where the painted-on bits of her go: things drawn over the sprite, not in it.
 *
 * They live here so overlays.test.ts can check each one against the grid it lands on. Every number in
 * this file has been wrong at least once, always the same way: right for the sprite as it was, and
 * still there after the sprite changed.
 */
import { BED, FRAME, POSES, type Pose } from "./sprites.js";

// Placed by hand. Stepping them by a loop leaves a half-width gap at one end of a symmetric bed.
export const BED_STRIPES = [5, 8, 11, 14];

export const RAIN_STREAKS: [number, number][] = [
  [2, 0],
  [6, 0.45],
  [10, 0.2],
  [14, 0.7],
];
export const SNOW_FLAKES: [number, number][] = [
  [3, 0],
  [7, 0.55],
  [11, 0.3],
  [14, 0.8],
];

// prettier-ignore
export const COLLAR: Record<Pose, { dx: number; w: number; dy: number; tag: number }> = {
  loaf:    { dx: -8, w: 12, dy: -7, tag: -2 },
  sit:     { dx: -6, w: 12, dy: -9, tag:  0 },
  stand:   { dx: -6, w: 12, dy: -7, tag:  0 },
  play:    { dx: -7, w: 12, dy: -9, tag: -1 },
  perk:    { dx: -6, w: 12, dy: -9, tag:  0 },
  walk:    { dx: -6, w: 12, dy: -7, tag:  0 },
  stretch: { dx: -6, w: 12, dy: -5, tag:  0 },
  pounce:  { dx: -7, w: 12, dy: -6, tag: -1 },
  peek:    { dx: -4, w:  8, dy: -2, tag:  0 },
  flop:    { dx:  5, w:  2, dy: -6, tag:  5 },
};

export const GROOM = { pawX: 10, pawY: 9, tipX: 11, tipY: 8, tongueX: 9, tongueY: 10 };

export const KNEAD = { y: 17, left: 4, right: 14, w: 2 };

export const EAR = { y: 1, left: 2, right: 15 };

export const YAWN = { y: 9, x: 6, w: 5 };

export const FRAME_X = 16;
export const FRAME_CENTRE = FRAME_X + Math.floor(FRAME.w / 2);

// Every pose has its face in the same place except `perk`, which is a row lower. Measured off the
// grid, not written down, so a pose that moves takes the overlays with it.
export function faceShift(pose: Pose): number {
  const noseRow = (p: Pose) => POSES[p].rows.findIndex((row) => row.includes("nn"));
  return noseRow(pose) - noseRow("loaf");
}

// The sprite already knows where her eye shines: one `h` cell per eye. Reading it beats a table,
// which was wrong for five poses out of ten.
export function eyeHighlights(pose: Pose): { l: number; r: number; row: number } {
  const rows = POSES[pose].rows;
  const row = rows.findIndex((r) => r.includes("h"));
  const cols = [...(rows[row] ?? "")].flatMap((c, i) => (c === "h" ? [i] : []));
  const ox = POSES[pose].ox;
  return { l: (cols[0] ?? 0) + ox, r: (cols[1] ?? 0) + ox, row };
}

export const poseGrid = (pose: Pose): string[] => POSES[pose].rows;
export const bedGrid = (): string[] => BED.rows;
