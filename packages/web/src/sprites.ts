/**
 * The cat, drawn by hand, one pixel at a time. Not a pixelation filter. See DECISIONS.md.
 *
 * Each letter is a ROLE, not a colour, which is how one grid draws every cat: `f` and `d` come from
 * whichever fur she has, `e` from her eyes.
 *
 *  . transparent      f fur            d fur, shaded      b belly / muzzle
 *  w outline          e eye, open      n nose              m mouth
 *  p inner ear        h highlight (one pixel, always white)
 *  c blush (two pixels per cheek, and worth more than any other pair)
 */

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

/**
 * Bread. The default, and the one she's in most of the time.
 *
 * Head, shoulders and body must not share one box, however carefully shaded: that reads as a toaster.
 * The head tapers, the shoulders widen below the chin, and the loaf rounds back in at the paws. Keep
 * fur at both sides of the pale front or it turns into a panel.
 */
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

/**
 * On her side, belly out, all four paws loose. What a cat does when it has decided the room is safe.
 *
 * The head keeps the loaf's construction and faces the viewer, because a head in profile at this size
 * loses the eyes and the blush, which are the only things carrying the expression. Belly-up with the
 * head flat was the first attempt and it read as a dead cat.
 */
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
  ["wwwwwwwwwwwwwwww", "wddddddddddddddw", "wwwwwwwwwwwwwwww", "...ww......ww..."],
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

/**
 * The same frame with nothing in it, for when one of you has put a drawing there.
 *
 * A separate grid rather than blitting FRAME with the fish mapped away: the fish is not only `g`
 * cells, it has two outline pixels inside the mount, and those would sit in the middle of somebody's
 * drawing as specks nobody put there.
 */
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

/**
 * The word, hand-set. Real letters rather than canvas fillText: at this scale antialiased text beside
 * hand-placed pixels looks like a screenshot of two different programs.
 *
 * The m is five columns and the rest are three. A three-column m has room for only two stems, so it
 * comes out as a capital pi and the word reads "nrrp". One column of air between glyphs, 17 total,
 * and the fourth row exists only for the descender on the p.
 */
export const MRRP = sprite(
  ["wwwww.ww..ww..ww.", "w.w.w.w...w...w.w", "w.w.w.w...w...ww.", "..............w.."],
  0,
  0,
);

/**
 * The same frame with a photo of her in it, used once he has taken one. A separate sprite rather than
 * an overdraw, so the picture is authored: FRAME's inner area is exactly 7x5, enough for ears, two
 * eyes and a nose and not one pixel more. `c` is her fur, so the photo is of HER cat.
 */
/**
 * Her head alone, for the tab icon.
 *
 * PERK's head with the two empty edge columns trimmed, so it fills a square favicon instead of
 * floating in it. Its own grid rather than a runtime slice of PERK: at sixteen displayed pixels the
 * crop is the entire drawing, and that is a decision to make in the art, not in a substring.
 */
// prettier-ignore
export const HEAD = sprite(
  [
    ".ww..........ww.",
    ".wffw......wffw.",
    ".wfpfw....wfpfw.",
    ".wfpfw....wfpfw.",
    ".wffffwwwwffffw.",
    "wfdffffffffffdfw",
    "wffffffffffffffw",
    "wffbbbbbbbbbbffw",
    "wfcbhebbbbhebcfw",
    "wfcbeebbbbeebcfw",
    "wffbbbbnnbbbbffw",
    "wffbbbbmmbbbbffw",
    ".wffbbbbbbbbffw.",
    ".wfffbbbbbbfffw.",
    "..wwffffffffww..",
    "...wwwwwwwwww...",
  ],
  0,
  0,
);

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

/**
 * The door, opening. Hinged left, handle right. The leaf foreshortens as it swings toward you, so it
 * narrows from the right while staying attached at the left. The handle travels with the outer edge:
 * that one pixel moving inward is what sells the rotation, and without it this reads as a shutter.
 *
 * Four frames rather than a computed transform. Resampling a rotated rectangle onto this grid gives
 * pixels of two different sizes, which is the one thing the look forbids. `o` is what lies beyond.
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

/**
 * A small bow, for the thing he brings her.
 *
 * Deliberately not one of her gifts below. Hers are found objects: a leaf, a bottle cap, a moth she
 * carried in. His is chosen, so it is the one object in the room that is obviously shop-bought, and
 * it should not be mistakable for something the cat dragged home.
 *
 * `r` the ribbon, `h` its shine.
 */
export const BROUGHT = sprite([".r.r.", ".rhr.", ".r.r."], 0, 0);

/**
 * A tuft of her, left on the rug after a brush.
 *
 * Three rows of nothing much, which is the correct amount of drawing for cat hair. `f` takes her own
 * fur colour at the call site, so what is on the rug is always what is on the cat.
 */
/*
 * A tuft of her, left where he brushed her.
 *
 * Five pixels of lightened fur once, on a floor of nearly the same tone. It measured 1.43:1 against
 * the floor, which is to say nobody ever saw it. The outline is what makes it read at this size.
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
export const MUG = sprite([".wwww.", "wccccw", "wcccdw", "wcccdw", ".wwww."], 0, 0);

/** On its side, where it landed. Same object, so it has to read as the same object. */
export const MUG_DOWN = sprite(["..wwww..", ".wccccw.", "wdccccdw", ".wwwwww."], 0, 0);

/**
 * "ek ek", in the bubble, when there is a bird on the sill. Written out rather than drawn as a mouth
 * animation: at this size a moving jaw is two pixels flickering, which reads as a rendering fault.
 *
 * Two, not three. Three needs about 32 columns and the bubble is 17, so they render as blocks of
 * noise, which reads as a broken font rather than as a cat.
 */
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
