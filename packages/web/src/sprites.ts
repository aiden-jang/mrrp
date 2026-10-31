/** Sprite cells encode palette roles; see DECISIONS.md.
 * . transparent; f/d fur/shade; b belly; w outline; e eyes; n nose; m mouth; p inner ear; h highlight; c blush. */

export type Pose =
  "loaf" | "sit" | "stand" | "play" | "perk" | "walk" | "stretch" | "pounce" | "peek" | "flop";

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

/** Loaf silhouette: tapered head, wider shoulders, rounded paws, and fur beside the pale belly. */
export const LOAF = sprite(
  [
    "...ww........ww.....",
    "..wffw......wffw....",
    "..wfpfw....wfpfw....",
    "..wffffwwwwffffw....",
    ".wfdffffdffffdfw....",
    ".wfbbbbbbbbbbbfw....",
    ".wfbchebbbbhecbfw...",
    ".wfbceebbbbeecbfw...",
    ".wfbbbbnnbbbbbfw....",
    ".wffbbbmmmbbbffw....",
    "..wffbbbbbbffw......",
    "wwffffffffffffww....",
    "wfdffffffffffffdfwww",
    "wfbbbbbbbbbbbbbbbffw",
    "wffbbbbbbbbbbbbbbffw",
    ".wfdffffffffffffdfw.",
    "..wffbbffffffbbffw..",
    "..wwddwwwwwwwwddww..",
    "...wwwwwwwwwwwwww...",
  ],
  -10,
  -18,
);

/** Upright. Used when she's paying attention to you. */
export const SIT = sprite(
  [
    "..ww..........ww..",
    ".wffw........wffw.",
    ".wfpfw......wfpfw.",
    ".wffffwwwwwwffffw.",
    ".wfdffffdffffdfw..",
    ".wfbbbbbbbbbbbbfw.",
    ".wfbchebbbbhecbfw.",
    ".wfbceebbbbeecbfw.",
    ".wfbbbbnnbbbbbfw..",
    ".wffbbbmmmbbbffw..",
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
    "..ww..........ww..",
    ".wffw........wffw.",
    ".wfpfw......wfpfw.",
    ".wffffwwwwwwffffw.",
    ".wfdffffdffffdfw..",
    ".wfbbbbbbbbbbbbfw.",
    ".wfbchebbbbhecbfw.",
    ".wfbceebbbbeecbfw.",
    ".wfbbbbnnbbbbbfw..",
    ".wffbbbmmmbbbffw..",
    "..wffffffffffffw..",
    "..wfdbbbbbbbbdfw..",
    "..wfbbbbbbbbbbfw..",
    "..wffffffffffffw..",
    "..wffbbffffbbffw..",
    "..wwbbwwwwwwbbww..",
    "...ww........ww...",
  ],
  -9,
  -17,
);

/** Her tail, drawn separately so it can move without redrawing her. */
export const TAIL = sprite(["wwww..", "wffww.", "wffffw", ".wwffw", "...wfw", "....ww"], 0, 0);

/** Up on her back legs, one paw out. For the moods where she has opinions. */
export const PLAY = sprite(
  [
    "..ww..........ww..",
    ".wffw........wffw.",
    ".wfpfw......wfpfw.",
    ".wffffwwwwwwffffw.",
    ".wfdffffdffffdfw..",
    ".wfbbbbbbbbbbbbfw.",
    ".wfbchebbbbhecbfw.",
    ".wfbceebbbbeecbfw.",
    ".wfbbbbnnbbbbbfw..",
    ".wffbbbmmmbbbffw..",
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
  -19,
);

/** Sitting tall, ears up. What a good day looks like from the outside. */
export const PERK = sprite(
  [
    "..ww..........ww..",
    ".wffw........wffw.",
    ".wfpfw......wfpfw.",
    ".wfpfw......wfpfw.",
    ".wffffwwwwwwffffw.",
    ".wfdffffdffffdfw..",
    ".wfbbbbbbbbbbbbfw.",
    ".wfbchebbbbhecbfw.",
    ".wfbceebbbbeecbfw.",
    ".wfbbbbnnbbbbbfw..",
    ".wffbbmmmmbbbbffw.",
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
  -20,
);

/** A passing step rather than the standing cat sliding across the boards. */
export const WALK = sprite(
  [
    "..ww..........ww..",
    ".wffw........wffw.",
    ".wfpfw......wfpfw.",
    ".wffffwwwwwwffffw.",
    ".wfdffffdffffdfw..",
    ".wfbbbbbbbbbbbbfw.",
    ".wfbchebbbbhecbfw.",
    ".wfbceebbbbeecbfw.",
    ".wfbbbbnnbbbbbfw..",
    ".wffbbbmmmbbbffw..",
    "..wffffffffffffw..",
    "..wfdbbbbbbbbdfw..",
    "..wfbbbbbbbbbbfw..",
    "..wffffffffffffw..",
    ".wwbbwwffffww.....",
    "wwddww......wwbbww",
    ".wwww........wwww.",
  ],
  -9,
  -17,
);

/** Front paws long, chin low, and the back half still high: an actual cat stretch. */
export const STRETCH = sprite(
  [
    "..ww..........ww..........",
    ".wffw........wffw.........",
    ".wfpfw......wfpfw.........",
    ".wffffwwwwwwffffwwwww.....",
    ".wfdffffdffffdfwfffffw....",
    ".wfbbbbbbbbbbbbfwfffffw...",
    ".wfbchebbbbhecbfwffffdfw..",
    ".wfbceebbbbeecbfwffffdfw..",
    ".wfbbbbnnbbbbbfwwffffdfw..",
    ".wffbbbmmmbbbffffffffdfw..",
    "..wffbbbbbbffffffffffffw..",
    "...wffffffffffffffffffdfw.",
    "...wwbbwwffffffffffbbffw..",
    ".wwbbww...........wwbbwww.",
    "wwwwww.............wwwww..",
  ],
  -9,
  -15,
);

/** Low and wide for the last beat of a chase, with both paws committed. */
export const POUNCE = sprite(
  [
    "...ww..........ww.....",
    "..wffw........wffw....",
    "..wfpfw......wfpfw....",
    "..wffffwwwwwwffffw....",
    ".wfdffffdffffdfw......",
    ".wfbbbbbbbbbbbbfw.....",
    ".wfbchebbbbhecbfw.....",
    ".wfbceebbbbeecbfw.....",
    ".wfbbbbnnbbbbbfw......",
    ".wffbbbmmmbbbffw......",
    ".wwfdffffffffdfww.....",
    "wwbbfbbbbbbbbfbbww....",
    "wwwwfdbbbbbbdffwww....",
    "....wffffffffw........",
    "...wwbbwwwwbbww.......",
    "..wwww......wwww......",
  ],
  -10,
  -16,
);

/** Only the part of her that should clear the box rim, paws included. */
export const PEEK = sprite(
  [
    "..ww..........ww..",
    ".wffw........wffw.",
    ".wfpfw......wfpfw.",
    ".wffffwwwwwwffffw.",
    ".wfdffffdffffdfw..",
    ".wfbbbbbbbbbbbbfw.",
    ".wfbchebbbbhecbfw.",
    ".wfbceebbbbeecbfw.",
    ".wfbbbbnnbbbbbfw..",
    "wwffbbbmmmbbbffww.",
    "wbbwwffffffffwwbbw",
    ".ww............ww.",
  ],
  -9,
  -12,
);

/** Belly-up pose keeps the face toward the viewer so the eyes remain readable at sprite scale. */
export const FLOP = sprite(
  [
    "...ww........ww...............",
    "..wffw......wffw....ww...ww...",
    "..wfpfw....wfpfw...wffw.wffw..",
    "..wffffwwwwffffw...wffw.wffw..",
    ".wfdffffdffffdfw..wwffwwwffww.",
    ".wfbbbbbbbbbbbfwwwffffffffffww",
    ".wfbchebbbbhecbfffbbbbbbbbbbfw",
    ".wfbceebbbbeecbfbbbbbbbbbbbbfw",
    ".wfbbbbnnbbbbbfbbbbbbbbbbbbbfw",
    ".wffbbbmmmbbbffbbbbbbbbbbbbdfw",
    "..wffbbbbbbffbbbbbbbbbbbbbdfww",
    "...wwffffffffffffffffffffffw..",
    ".....wwffffffffffffffffffww...",
    ".......wwwwwwwwwwwwwwwww......",
  ],
  -10,
  -13,
);

export const POSES: Record<Pose, Sprite> = {
  loaf: LOAF,
  sit: SIT,
  stand: STAND,
  play: PLAY,
  perk: PERK,
  walk: WALK,
  stretch: STRETCH,
  pounce: POUNCE,
  peek: PEEK,
  flop: FLOP,
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
    "..ddffbffffffbffdd..",
    ".dfffbbbbbbbbbbfffd.",
    "dffbbbbbbbbbbbbbbffd",
    "dffbbbbbbbbbbbbbbffd",
    ".dfffbbbbbbbbbbfffd.",
    "..ddffbffffffbffdd..",
    "....dddddddddddd....",
  ],
  -11,
  0,
);

/** A shelf, so the thing she knocks off has somewhere to have been. */
export const SHELF = sprite(
  ["wwwwwwwwwwwwwwww", "wddddwddddwddddw", "wwwwwwwwwwwwwwww", "...ww......ww..."],
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
    ".wddwddw..",
    "..wwwww...",
  ],
  0,
  0,
);

/** A picture on the wall. It is a fish, which is the only art she would have chosen. */
export const FRAME = sprite(
  [
    "wwwwwwwwwwwwwwwwwwwww",
    "wfffffffffffffffffffw",
    "wfwwwwwwwwwwwwwwwwwfw",
    "wfwhhhhhhhhhhhhhhhwfw",
    "wfwhhhhhhhhhhhhhhhwfw",
    "wfwhhhhhggggghhhggwfw",
    "wfwhhhggggggggghggwfw",
    "wfwhhgggwgggggggggwfw",
    "wfwhhhggggggggghggwfw",
    "wfwhhhhhggggghhhggwfw",
    "wfwhhhhhhhhhhhhhhhwfw",
    "wfwhhhhhhhhhhhhhhhwfw",
    "wfwwwwwwwwwwwwwwwwwfw",
    "wfffffffffffffffffffw",
    "wwwwwwwwwwwwwwwwwwwww",
  ],
  0,
  0,
);

/** Empty frame uses its own grid so the fish outline cannot leave pixels inside user drawings. */
// prettier-ignore
export const FRAME_EMPTY = sprite(
  [
    "wwwwwwwwwwwwwwwwwwwww",
    "wfffffffffffffffffffw",
    "wfwwwwwwwwwwwwwwwwwfw",
    "wfwhhhhhhhhhhhhhhhwfw",
    "wfwhhhhhhhhhhhhhhhwfw",
    "wfwhhhhhhhhhhhhhhhwfw",
    "wfwhhhhhhhhhhhhhhhwfw",
    "wfwhhhhhhhhhhhhhhhwfw",
    "wfwhhhhhhhhhhhhhhhwfw",
    "wfwhhhhhhhhhhhhhhhwfw",
    "wfwhhhhhhhhhhhhhhhwfw",
    "wfwhhhhhhhhhhhhhhhwfw",
    "wfwwwwwwwwwwwwwwwwwfw",
    "wfffffffffffffffffffw",
    "wwwwwwwwwwwwwwwwwwwww",
  ],
  0,
  0,
);

/** Top-left of the hole in every frame grid above, and how big it is. A drawing is exactly this. */
export const FRAME_HOLE = { x: 3, y: 3, w: 15, h: 9 };

/** Hand-set glyphs: five columns for m, three for other letters, with the final row for p's descender. */
export const MRRP = sprite(
  ["wwwww.ww..ww..ww.", "w.w.w.w...w...w.w", "w.w.w.w...w...ww.", "..............w.."],
  0,
  0,
);

/**
 * The same frame with a photo of her in it, used once he has taken one. A separate sprite rather than
 * an overdraw, so the picture is authored: FRAME's inner area is exactly 7x5, enough for ears, two
 * eyes and a nose and not one pixel more. `c` is her fur, so it is a photo of her and not of a cat.
 */
export const FRAME_CAT = sprite(
  [
    "wwwwwwwwwwwwwwwwwwwww",
    "wfffffffffffffffffffw",
    "wfwwwwwwwwwwwwwwwwwfw",
    "wfwhhhhhhhhhhhhhhhwfw",
    "wfwhhhcchhhhhcchhhwfw",
    "wfwhhccchhhhhccchhwfw",
    "wfwhhcccccccccccchwfw",
    "wfwhhcecccccccechhwfw",
    "wfwhhccccccncccchhwfw",
    "wfwhhhcccccccccchhwfw",
    "wfwhhhhcccccccchhhwfw",
    "wfwhhhhhhhhhhhhhhhwfw",
    "wfwwwwwwwwwwwwwwwwwfw",
    "wfffffffffffffffffffw",
    "wwwwwwwwwwwwwwwwwwwww",
  ],
  0,
  0,
);

/** Four left-hinged door frames preserve whole-pixel rendering; the handle follows the outer edge. */
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

/**
 * A cardboard box, in two halves so she can be inside it. The back is drawn before her and the front
 * after. A single box sprite either covers her completely or floats in front of her, and neither reads
 * as a cat in a box. `k` is the cardboard, `s` its shaded inner wall, `w` the outline.
 */
export const BOX_BACK = sprite(
  [
    "..wwwwwwwwwwwwwwwwwwwwwwww..",
    ".wkkkkkkkkkkkkkkkkkkkkkkkkw.",
    "wksssssssssssssssssssssssskw",
    "wssssssssssssssssssssssssssw",
  ],
  0,
  0,
);

/** The near wall, drawn after her, which is what makes her be inside rather than behind. */
export const BOX_FRONT = sprite(
  [
    "wkkkkkkkkkkkkkkkkkkkkkkkkkkw",
    "wkkkkkkkkkkkkkkkkkkkkkkkkkkw",
    "wkkkkkkkkkkkkkkkkkkkkkkkkkkw",
    "wkkkkkkkkkkkkkkkkkkkkkkkkkkw",
    "wkkkkkkkkkkkkkkkkkkkkkkkkkkw",
    "wkkkkkkkkkkkkkkkkkkkkkkkkkkw",
    "wkkkkkkkkkkkkkkkkkkkkkkkkkkw",
    ".wwwwwwwwwwwwwwwwwwwwwwwwww.",
  ],
  0,
  0,
);

/*
 * A cake, for the room's own birthday. Seven pixels across, the widest a thing can be here without
 * competing with the cat. `r` is the candle flame, `g` the icing, both from the caller's palette.
 */
export const CAKE = sprite(["...r...", "...d...", ".ggggg.", "ddddddd", "ddddddd"], 0, 0);

/** Companion gifts stay distinct from found objects. The caller supplies legible floor contrast. */
export const LEFT_OUT = sprite([".r.r.", ".rhr.", ".r.r."], 0, 0);

/**
 * A tuft of her, left on the rug after a brush.
 *
 * `f` takes her own fur colour, so what is on the rug is what is on the cat. Five pixels of that
 * once, on a rug of nearly the same tone: 1.43:1, never seen. The outline is what makes it read.
 */
export const TUFT = sprite(["w....w", ".w..w.", ".wffw.", "wffffw", ".wwww."], 0, 0);

/**
 * The things she leaves on the floor while he's away. Tiny on purpose: a cat's gift is specific, not
 * impressive, and anything bigger or prettier reads as loot, which is a game mechanic.
 *
 * `g` leaf green, `r` its rib, `m` metal, `n` moth wing, `w` outline.
 */
export const GIFT_LEAF = sprite([".ggg.", "grrrg", ".ggg."], 0, 0);

export const GIFT_CAP = sprite([".www.", "wmmmw", ".www."], 0, 0);

export const GIFT_MOTH = sprite(["n.w.n", "nnwnn", ".n.n."], 0, 0);

/**
 * The thing on the shelf. A small stoneware mug, which is the correct object for this: it is
 * plausibly hers, it is plausibly survivable, and everyone has watched a cat do this to one.
 *
 * `c` the glaze, `d` its shadow side, `w` outline.
 */
export const MUG = sprite([".wwww.", "wcccww", "wccw.w", "wcccdw", ".wwww."], 0, 0);

/** On its side, where it landed. Same object, so it has to read as the same object. */
export const MUG_DOWN = sprite(["..wwww..", ".wccccw.", "wdccccdw", ".wwwwww."], 0, 0);

/** Two ek glyphs fit the bubble; a third exceeds its pixel width. */
export const EK = sprite(
  ["www.w.w..www.w.w.", "ww..ww...ww..ww..", "www.w.w..www.w.w.", "................."],
  0,
  0,
);

/**
 * A small brown bird on the sill.
 *
 * Side-on and tiny. The point is not the bird, it is her reaction to the bird, so it has to be
 * unmistakable in about six pixels and then get out of the way.
 */
export const BIRD = sprite(["..ww..", ".wbbw.", "wbbbbo", ".wbbw.", "..ww.."], 0, 0);
