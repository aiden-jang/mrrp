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

/**
 * The word, hand-set.
 *
 * The app is named after a noise the cat had never once made. She says it now, in a bubble, whenever
 * anything happens to her. Real letters rather than canvas fillText: at this scale antialiased text
 * next to hand-placed pixels looks like a screenshot of two different programs.
 *
 * The m is five columns wide and the rest are three. My first cut made every glyph 3 wide, and a
 * three-column m has room for only two stems, so it came out as a passable capital pi and the word
 * read "nrrp". A letter with three stems needs five columns. One column of air between glyphs, 17
 * total, and the fourth row exists only for the descender on the p.
 */
export const MRRP = sprite(
  [
    "wwwww.ww..ww..ww.",
    "w.w.w.w...w...w.w",
    "w.w.w.w...w...ww.",
    "..............w..",
  ],
  0,
  0,
);

/**
 * The same frame with a photo of her in it, used once he has taken one.
 *
 * A separate sprite rather than an overdraw, so the picture is authored rather than assembled: the inner
 * area of FRAME is exactly 7x5, which is enough for ears, two eyes and a nose and not one pixel more.
 * `c` is her fur so the photo is of HER cat, whatever colour that is, and not a generic one.
 */
export const FRAME_CAT = sprite(
  [
    "wwwwwwwwwwwww",
    "wfffffffffffw",
    "wfwwwwwwwwwfw",
    "wfwcchhhccwfw",
    "wfwcccccccwfw",
    "wfwcecccecwfw",
    "wfwcccncccwfw",
    "wfwwwwwwwwwfw",
    "wfwwwwwwwwwfw",
    "wfffffffffffw",
    "wwwwwwwwwwwww",
  ],
  0,
  0,
);

/**
 * The door, opening.
 *
 * Hinged on the left, because the handle is on the right. As it swings toward you the leaf is
 * foreshortened, so it narrows from the right while staying attached at the left, and the doorway
 * behind it is revealed in the gap. The handle travels with the leaf's outer edge: that one pixel
 * moving inward is what sells the rotation. Without it the door reads as a shutter sliding away.
 *
 * `o` is what's beyond the door, which is the whole point of opening it.
 *
 * Four frames rather than a computed transform. A rotated rectangle resampled onto this grid gives
 * you pixels of two different sizes, which is the one thing the entire look forbids.
 */
const DOOR_AJAR = sprite(
  [
    "wwwwwwwwwwww",
    "wffffffffffw",
    "wfddddddoofw",
    "wfddddddoofw",
    "wfddddddoofw",
    "wfdddddhoofw",
    "wfddddddoofw",
    "wfddddddoofw",
    "wfddddddoofw",
    "wfddddddoofw",
    "wfddddddoofw",
    "wfddddddoofw",
    "wfddddddoofw",
    "wfddddddoofw",
    "wfddddddoofw",
    "wffffffffffw",
  ],
  0,
  0,
);

const DOOR_HALF = sprite(
  [
    "wwwwwwwwwwww",
    "wffffffffffw",
    "wfddddoooofw",
    "wfddddoooofw",
    "wfddddoooofw",
    "wfdddhoooofw",
    "wfddddoooofw",
    "wfddddoooofw",
    "wfddddoooofw",
    "wfddddoooofw",
    "wfddddoooofw",
    "wfddddoooofw",
    "wfddddoooofw",
    "wfddddoooofw",
    "wfddddoooofw",
    "wffffffffffw",
  ],
  0,
  0,
);

const DOOR_WIDE = sprite(
  [
    "wwwwwwwwwwww",
    "wffffffffffw",
    "wfddoooooofw",
    "wfddoooooofw",
    "wfddoooooofw",
    "wfdhoooooofw",
    "wfddoooooofw",
    "wfddoooooofw",
    "wfddoooooofw",
    "wfddoooooofw",
    "wfddoooooofw",
    "wfddoooooofw",
    "wfddoooooofw",
    "wfddoooooofw",
    "wfddoooooofw",
    "wffffffffffw",
  ],
  0,
  0,
);

/** Closed → wide, in order. Index with a rounded progress. */
export const DOOR_FRAMES: Sprite[] = [DOOR, DOOR_AJAR, DOOR_HALF, DOOR_WIDE];
