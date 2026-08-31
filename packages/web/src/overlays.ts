// Bits drawn over the sprite rather than in it. Every number here has been wrong at least once,
// always the same way: right for the old sprite. overlays.test.ts checks each against its grid.
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

// Measure off the grid, don't write the rows down, so a pose that moves takes its overlays with
// it. `perk` has its face a row lower than every other pose.
export function faceShift(pose: Pose): number {
  const noseRow = (p: Pose) => POSES[p].rows.findIndex((row) => row.includes("nn"));
  return noseRow(pose) - noseRow("loaf");
}

// Read the eye shine off the sprite's `h` cells. The table that used to hold them was wrong for
// five poses out of ten.
export function eyeHighlights(pose: Pose): { l: number; r: number; row: number } {
  const rows = POSES[pose].rows;
  const row = rows.findIndex((r) => r.includes("h"));
  const cols = [...(rows[row] ?? "")].flatMap((c, i) => (c === "h" ? [i] : []));
  const ox = POSES[pose].ox;
  return { l: (cols[0] ?? 0) + ox, r: (cols[1] ?? 0) + ox, row };
}

export const poseGrid = (pose: Pose): string[] => POSES[pose].rows;
export const bedGrid = (): string[] => BED.rows;
