/**
 * The cat, drawn by hand, one pixel at a time.
 *
 * ─── Why grids and not a filter ──────────────────────────────────────────────
 *  Running a pixelation pass over a smooth drawing gives you a smooth drawing
 *  with square edges, and it always looks like a mistake. Real pixel art is a
 *  set of decisions about individual pixels: where the outline breaks, which
 *  single pixel is the highlight in the eye, how few pixels a nose can be.
 *  So these are grids you can read and edit in the source.
 *
 *  Every character maps to a palette ROLE, not a colour, so `dress` still
 *  recolours her: `f` and `d` come from her fur, `e` from her eyes.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  . transparent      f fur            d fur, shaded      b belly / muzzle
 *  w outline          e eye, open      n nose              m mouth
 *  p inner ear        h highlight (one pixel, always white)
 *  c blush (two pixels per cheek, and worth more than any other pair)
 */

export type Pose = "loaf" | "sit" | "stand" | "play" | "perk";

/** Parsed sprite: rows of characters, guaranteed rectangular. */
export interface Sprite {
  w: number;
  h: number;
  rows: string[];
  /** Where the sprite sits relative to its anchor, in pixels. */
  ox: number;
  oy: number;
}

function sprite(rows: string[], ox: number, oy: number): Sprite {
  const w = rows[0]!.length;
  // A single miscounted row silently shears the whole cat, and it is very hard to see by eye.
  for (const [i, r] of rows.entries()) {
    if (r.length !== w) throw new Error(`sprite row ${i} is ${r.length} wide, expected ${w}`);
  }
  return { w, h: rows.length, rows, ox, oy };
}

/** Bread. The default, and the one she's in most of the time. */
export const LOAF = sprite(
  [
    "...ww..............ww...",
    "..wffw............wffw..",
    "..wfpfw..........wfpfw..",
    "..wffffwwwwwwwwwwffffw..",
    "..wfdffffdffffdffffdfw..",
    "..wfbbbbbbbbbbbbbbbbfw..",
    "..wfbceeebbbbbbeeecbfw..",
    "..wfbceeebbbbbbeeecbfw..",
    "wwwfbbbbbbbnnbbbbbbbfwww",
    "..wffbbbbbbmmbbbbbbffw..",
    "...wdffffffffffffffdw...",
    "..wffdffffffffffffdffw..",
    ".wffffdffffffffffdffffw.",
    ".wfbbbbbbbbbbbbbbbbbbfw.",
    ".wffbbbbbbbbbbbbbbbbffw.",
    ".wfdffffffffffffffffdfw.",
    ".wddddddddddddddddddddw.",
    "..wwwwwwwwwwwwwwwwwwww..",
  ],
  -12,
  -18,
);

/** Upright. Used when she's paying attention to you. */
export const SIT = sprite(
  [
    "..ww..........ww..",
    ".wffw........wffw.",
    ".wfpfw......wfpfw.",
    ".wffffwwwwwwffffw.",
    ".wfdffdffffdffdfw.",
    ".wfbbbbbbbbbbbbfw.",
    ".wfbceeebbeeecbfw.",
    ".wfbceeebbeeecbfw.",
    ".wfbbbbbnnbbbbbfw.",
    ".wffbbbbmmbbbbffw.",
    "..wfdffffffffdfw..",
    "..wfbbbbbbbbbbfw..",
    "..wfbbbbbbbbbbfw..",
    "..wfdbbbbbbbbdfw..",
    "..wffbbbbbbbbffw..",
    "..wfdffffffffdfw..",
    ".wwbbwwffffwwbbww.",
    "..wwddddddddddww..",
    "..wwwwwwwwwwwwww..",
  ],
  -9,
  -19,
);

/** On her feet, at the door. Slimmer, tail up. */
export const STAND = sprite(
  [
    "..ww..........ww....",
    ".wffw........wffw...",
    ".wfpfw......wfpfw..w",
    ".wffffwwwwwwffffw.wf",
    ".wffffffffffffffw.wf",
    ".wfbbbbbbbbbbbbfw.wf",
    ".wfbbeebbbbeebbfw.wf",
    ".wfbbbbbnnbbbbbfw.wf",
    ".wffbbbbbbbbbbffwwff",
    "..wffffffffffffffffw",
    "..wffffffffffffffw..",
    "..wfdffffffffdffw...",
    "..wffffffffffffw....",
    "..wffffffffffffw....",
    "..wffbbffbbffffw....",
    "..wwwwwwwwwwwwww....",
  ],
  -10,
  -16,
);

/** Her tail, drawn separately so it can move without redrawing her. */
export const TAIL = sprite(
  [
    "wwww..",
    "wffww.",
    "wffffw",
    ".wwffw",
    "...wfw",
    "....ww",
  ],
  0,
  0,
);

/** Up on her back legs, one paw out. For the moods where she has opinions. */
export const PLAY = sprite(
  [
    "..ww..........ww..",
    ".wffw........wffw.",
    ".wfpfw......wfpfw.",
    ".wffffwwwwwwffffw.",
    ".wfdffdffffdffdfw.",
    ".wfbbbbbbbbbbbbfw.",
    ".wfbeeebbbbeeebfw.",
    ".wfbbbbbnnbbbbbfw.",
    ".wffbbbbmmbbbbffw.",
    "wwfdffffffffdfw...",
    "wbbfbbbbbbbfw.....",
    "wwwfbbbbbbbfw.....",
    "..wfdbbbbbdfw.....",
    "..wffbbbbbffw.....",
    "..wfdffffffdfw....",
    "..wffffffffffw....",
    ".wwbbwwwwbbww.....",
    "..wwwwwwwwww......",
  ],
  -9,
  -18,
);

/** Sitting tall, ears up. What a good day looks like from the outside. */
export const PERK = sprite(
  [
    "..ww..........ww..",
    ".wffw........wffw.",
    ".wfpfw......wfpfw.",
    ".wfpfw......wfpfw.",
    ".wffffwwwwwwffffw.",
    ".wfdffdffffdffdfw.",
    ".wfbbbbbbbbbbbbfw.",
    ".wfbceeebbeeecbfw.",
    ".wfbceeebbeeecbfw.",
    ".wfbbbbbnnbbbbbfw.",
    ".wffbbbmmmmbbbffw.",
    "..wfdffffffffdfw..",
    "..wfbbbbbbbbbbfw..",
    "..wfbbbbbbbbbbfw..",
    "..wfbbbbbbbbbbfw..",
    "..wfdbbbbbbbbdfw..",
    "..wffbbbbbbbbffw..",
    "..wfdffffffffdfw..",
    ".wwbbwwffffwwbbww.",
    "..wwddddddddddww..",
    "..wwwwwwwwwwwwww..",
  ],
  -9,
  -21,
);

export const POSES: Record<Pose, Sprite> = {
  loaf: LOAF,
  sit: SIT,
  stand: STAND,
  play: PLAY,
  perk: PERK,
};

/** The door she waits at. */
export const DOOR = sprite(
  [
    "wwwwwwwwwwww",
    "wffffffffffw",
    "wfddddddddfw",
    "wfddddddddfw",
    "wfddddddddfw",
    "wfdddddddhfw",
    "wfddddddddfw",
    "wfddddddddfw",
    "wfddddddddfw",
    "wfddddddddfw",
    "wfddddddddfw",
    "wfddddddddfw",
    "wfddddddddfw",
    "wfddddddddfw",
    "wfddddddddfw",
    "wffffffffffw",
  ],
  0,
  0,
);

/** The window the beam comes from. Drawn on the wall so the light has a source. */
export const WINDOW = sprite(
  [
    "wwwwwwwwwwwwwwwww",
    "whhhhhhhwhhhhhhhw",
    "whhhhhhhwhhhhhhhw",
    "whhhhhhhwhhhhhhhw",
    "whhhhhhhwhhhhhhhw",
    "wwwwwwwwwwwwwwwww",
    "whhhhhhhwhhhhhhhw",
    "whhhhhhhwhhhhhhhw",
    "whhhhhhhwhhhhhhhw",
    "whhhhhhhwhhhhhhhw",
    "wwwwwwwwwwwwwwwww",
  ],
  0,
  0,
);

/** Her bed, which she is usually not in. `d` is the rim, `f` the cushion, `b` the dent she leaves. */
export const BED = sprite(
  [
    "....dddddddddddd....",
    "..ddffffffffffffdd..",
    ".dfffbbbbbbbbbbfffd.",
    "dffbbbbbbbbbbbbbbffd",
    "dffbbbbbbbbbbbbbbffd",
    ".dfffbbbbbbbbbbfffd.",
    "..ddffffffffffffdd..",
    "....dddddddddddd....",
  ],
  -11,
  0,
);

/** A shelf, so the thing she knocks off has somewhere to have been. */
export const SHELF = sprite(
  [
    "wwwwwwwwwwwwwwww",
    "wddddddddddddddw",
    "wwwwwwwwwwwwwwww",
    "...ww......ww...",
  ],
  0,
  0,
);

/** A plant for the empty corner. `g` is leaf, `d` is pot. */
export const PLANT = sprite(
  [
    "....gg....",
    "..ggggg.g.",
    ".gggwgggg.",
    "gggwgwggg.",
    ".ggwgwgg..",
    "..gwgwg...",
    "...wgw....",
    "...wgw....",
    "..wdddw...",
    "..wdddw...",
    ".wwdddww..",
    ".wdddddw..",
    "..wwwww...",
  ],
  0,
  0,
);

/** A picture on the wall. It is a fish, which is the only art she would have chosen. */
export const FRAME = sprite(
  [
    "wwwwwwwwwwwww",
    "wfffffffffffw",
    "wfwwwwwwwwwfw",
    "wfwhhhhhhhwfw",
    "wfwhhgggwhwfw",
    "wfwhggggggwfw",
    "wfwhhgggwhwfw",
    "wfwhhhhhhhwfw",
    "wfwwwwwwwwwfw",
    "wfffffffffffw",
    "wwwwwwwwwwwww",
  ],
  0,
  0,
);
