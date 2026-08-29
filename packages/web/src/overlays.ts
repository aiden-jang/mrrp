import { BED, FRAME, POSES, type Pose } from "./sprites.js";

/*
 * Where the painted-on details go: the parts of her that are drawn over the sprite rather than in it.
 *
 * These are all offsets into hand-drawn grids, and every one of them has been wrong at least once. A
 * yawn a row out is a second mouth, a collar a row out is a second mouth, fog a row out paints over
 * the window's woodwork, and a stripe stepped by a loop leaves a half-width gap at one end.
 *
 * They live here rather than inside the renderer so `overlays.test.ts` can hold them against the
 * sprites they are supposed to land on. Checking that by eye is how they went wrong in the first
 * place, and a screenshot only proves the frame it was taken in.
 */

/** The bed's cushion runs 3 to 16. An even step leaves a half-width gap at one end of a symmetric bed. */
export const BED_STRIPES = [5, 8, 11, 14];

/** Four streaks and four flakes, each starting at a different point in its fall so they never march. */
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
// One row out and the collar reads as a second mouth. These came off the grids in sprites.ts with a
// script, not by eye. `flop` is the odd one: she is lying on her side, so the band is two pixels at
// the neck seen edge-on rather than twelve across a chest that is not facing you.
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

/** Washing: a paw held beside the mouth, over the pale muzzle, and a tongue that reaches it. */
export const GROOM = { pawX: 10, pawY: 9, tipX: 11, tipY: 8, tongueX: 9, tongueY: 10 };

/** Kneading, on the loaf's own two paws. Every other pose puts them somewhere else. */
export const KNEAD = { y: 17, left: 4, right: 14, w: 2 };

/** An ear twitch: one pixel on the outside edge of one ear. */
export const EAR = { y: 1, left: 2, right: 15 };

/** The yawn widens the mouth row. */
export const YAWN = { y: 9, x: 6, w: 5 };

export const FRAME_X = 16;
export const FRAME_CENTRE = FRAME_X + Math.floor(FRAME.w / 2);

/*
 * How far a pose's face sits from where the loaf's is.
 *
 * Nearly every pose is built on the same head, but `perk` has its ears up and everything below them
 * moved down a row. Fixed offsets therefore land one row out on that one pose, and had done since
 * before any of this: the yawn was opening her nose rather than her mouth whenever she was perked.
 *
 * Measured off the grid rather than written down, so a pose that shifts again shifts this with it.
 */
export function faceShift(pose: Pose): number {
  const noseRow = (p: Pose) => POSES[p].rows.findIndex((row) => row.includes("nn"));
  return noseRow(pose) - noseRow("loaf");
}

/*
 * Where her eye highlights are, taken off the grid.
 *
 * These used to be a hand-written table of offsets, and it was wrong for five of the ten poses: the
 * moving highlight landed on her muzzle in a loaf, on her blush standing, and on the dark of the eye
 * sitting. On `perk` it missed twice over, because that pose's face is a row lower and the table
 * assumed one row for everybody.
 *
 * The sprite already says where they go: one `h` cell per eye, on the row the eyes are on. Reading it
 * cannot drift, and a pose drawn tomorrow gets this for free.
 */
export function eyeHighlights(pose: Pose): { l: number; r: number; row: number } {
  const rows = POSES[pose].rows;
  const row = rows.findIndex((r) => r.includes("h"));
  const cols = [...(rows[row] ?? "")].flatMap((c, i) => (c === "h" ? [i] : []));
  const ox = POSES[pose].ox;
  return { l: (cols[0] ?? 0) + ox, r: (cols[1] ?? 0) + ox, row };
}

/** Handy for the tests: the sprite grid a pose is drawn from. */
export const poseGrid = (pose: Pose): string[] => POSES[pose].rows;
export const bedGrid = (): string[] => BED.rows;
