import { describe, expect, it } from "vitest";
import { MOODS, type Mood } from "../src/types.js";
import { RESPONSES } from "../src/moods.js";
import { FACE_KEYS } from "../src/faces.js";
import { LOOKS, EYES, timezones } from "../src/looks.js";
import { POSES, BED, DOOR, FRAME, MRRP, PLANT, SHELF, TAIL, WINDOW, type Sprite } from "../src/sprites.js";
import { sceneFor, hourIn, lightPhaseAt } from "../src/hours.js";

/**
 * The art and the copy have their own failure modes, and none of them throw.
 *
 * A sheared sprite, a mood with no pose, a `doing` line that reads "Bean has batting at the dust":
 * all of these render happily and look broken. Every test here is one I'd otherwise be catching by
 * squinting at a screenshot, which is slow and misses things.
 */

const ALL_SPRITES: [string, Sprite][] = [
  ...Object.entries(POSES),
  ["tail", TAIL], ["bed", BED], ["door", DOOR],
  ["frame", FRAME], ["plant", PLANT], ["shelf", SHELF], ["window", WINDOW],
  ["mrrp", MRRP],
];

/**
 * The word in the speech bubble, checked letter by letter.
 *
 * Rectangularity was never the problem here: my first cut was a perfectly rectangular 15x4 sprite
 * that spelled "nrrp", because I gave the m three columns and an m needs three stems. It rendered
 * happily and read as a capital pi. Nothing but eyes on the actual pixels catches that, so these
 * assert the stems rather than the shape.
 */
describe("every mood has a face", () => {
  // FACES is keyed by string, not by Mood, so a mood added without a face renders nothing at all and
  // nothing complains: not the compiler, not the build. The chip just quietly loses its face.
  it.each(MOODS.map((m) => m.id))("%s", (id) => {
    expect(FACE_KEYS).toContain(id);
  });

  it("has no faces for moods that do not exist", () => {
    // The other direction, so deleting a mood leaves no orphan grid behind.
    for (const k of FACE_KEYS) expect(MOODS.map((m) => m.id)).toContain(k);
  });
});

describe("the word she says", () => {
  /** Columns of the given row that have ink in them. */
  const inked = (row: number): number[] =>
    [...MRRP.rows[row]!].flatMap((c, i) => (c === "w" ? [i] : []));

  it("gives the m a five-column box, which is what three stems needs", () => {
    // Written the obvious way first, as `inked(1).filter(x => x < 5)`, this passed on the broken
    // sprite: with a 3-wide m the column-4 ink it was reading belonged to the next glyph's stem, so
    // the assertion held and the name lied. Mutation testing is the only reason I know that. Pin the
    // glyph's box instead, which a narrower m cannot satisfy.
    expect(MRRP.rows[0]!.slice(0, 6)).toBe("wwwww.");
    expect(MRRP.rows[1]!.slice(0, 6)).toBe("w.w.w.");
    expect(MRRP.rows[2]!.slice(0, 6)).toBe("w.w.w.");
  });

  it("spaces four glyphs with a clear column between each", () => {
    // Glyph starts: m at 0 (5 wide), then r, r, p at 6, 10, 14 (3 wide each).
    for (const gap of [5, 9, 13]) {
      for (let r = 0; r < MRRP.h; r++) expect(MRRP.rows[r]![gap], `row ${r} col ${gap}`).toBe(".");
    }
  });

  it("gives the p a descender and nothing else one", () => {
    // The fourth row exists only for the p's tail. Ink anywhere else on it is a stray pixel.
    expect(inked(3)).toEqual([14]);
  });

  it("fits in a bubble that fits in the room", () => {
    // The bubble is the word plus two columns of padding either side, and it is clamped inside a
    // 100-wide grid. If the word ever grows past this, the clamp starts cropping letters.
    expect(MRRP.w + 4).toBeLessThanOrEqual(30);
    expect(MRRP.h).toBe(4);
  });
});

describe("sprites", () => {
  it.each(ALL_SPRITES)("%s is rectangular", (_name, sp) => {
    // One miscounted row shears everything below it, and it is very hard to see by eye.
    for (const row of sp.rows) expect(row.length).toBe(sp.w);
    expect(sp.rows.length).toBe(sp.h);
  });

  it.each(ALL_SPRITES)("%s uses only known palette roles", (_name, sp) => {
    // A typo'd character is silently transparent: you get a hole in the cat, not an error.
    const known = new Set([".", "w", "f", "d", "b", "e", "n", "m", "p", "h", "c", "g"]);
    for (const row of sp.rows) {
      for (const ch of row) expect(known, `unknown role ${JSON.stringify(ch)}`).toContain(ch);
    }
  });

  it("gives every pose a face: two eyes and a nose", () => {
    for (const [name, sp] of Object.entries(POSES)) {
      const flat = sp.rows.join("");
      expect(flat.split("e").length - 1, `${name} eyes`).toBeGreaterThanOrEqual(4);
      expect(flat, `${name} nose`).toContain("n");
    }
  });

  it("keeps the same facial landmarks across every pose", () => {
    for (const [name, sp] of Object.entries(POSES)) {
      const eyeColumns = [...new Set(sp.rows.flatMap((row) => [...row].flatMap((ch, x) => ch === "e" ? [x] : [])))].sort((a, b) => a - b);
      const highlightColumns = [...new Set(sp.rows.flatMap((row) => [...row].flatMap((ch, x) => ch === "h" ? [x] : [])))].sort((a, b) => a - b);
      expect(eyeColumns, `${name} eye columns`).toEqual([5, 6, 11, 12]);
      expect(highlightColumns, `${name} highlight columns`).toEqual([5, 11]);
      expect(sp.rows.some((row) => row.includes("nn")), `${name} nose`).toBe(true);
    }
  });

  it("has authored silhouettes for movement instead of sliding a standing cat", () => {
    expect(Object.keys(POSES)).toEqual([
      "loaf", "sit", "stand", "play", "perk", "walk", "stretch", "pounce", "peek",
    ]);
    expect(POSES.stretch.w).toBeGreaterThan(POSES.sit.w);
    expect(POSES.pounce.h).toBeLessThan(POSES.sit.h);
    expect(POSES.peek.h).toBeLessThan(POSES.sit.h);
    expect(new Set(["walk", "stretch", "pounce", "peek"].map((pose) => POSES[pose as keyof typeof POSES].rows.join("\n"))).size).toBe(4);
  });
});

describe("moods", () => {
  it("has a response for every mood offered in the UI", () => {
    for (const m of MOODS) expect(RESPONSES[m.id]).toBeDefined();
    expect(Object.keys(RESPONSES).sort()).toEqual(MOODS.map((m) => m.id).sort());
  });

  it("names a pose that actually exists", () => {
    for (const [mood, r] of Object.entries(RESPONSES)) {
      expect(POSES[r.pose], `${mood} -> ${r.pose}`).toBeDefined();
    }
  });

  it('phrases every "doing" line to complete "<name> is ___"', () => {
    // This is the "Bean has batting at the dust" bug. The sentence is built with a single "is", so a
    // line starting with a past-tense verb reads as broken English and nothing catches it at runtime.
    const pastTense = /^(came|knocked|went|sat|brought|petted|brushed|had|was)\b/;
    for (const [mood, r] of Object.entries(RESPONSES)) {
      expect(r.doing, `${mood}: "${r.doing}"`).not.toMatch(pastTense);
      expect(r.doing[0]).toBe(r.doing[0]!.toLowerCase());
      expect(r.doing.endsWith(".")).toBe(false); // the template adds the full stop
    }
  });

  it("never renders a low mood as a distressed cat", () => {
    // The one rule the whole feature rests on: she answers a low mood, she does not mirror it. If sad
    // reads as pitiful, she stops using it, and the feature is dead.
    for (const low of ["sad", "stressed", "lonely", "tired"] as Mood[]) {
      const r = RESPONSES[low];
      expect(r.snug, `${low} should draw the room in`).toBeGreaterThanOrEqual(0.6);
      expect(r.purring, `${low} should purr`).toBe(true);
    }
  });

  it("keeps sparkles for good only, so they stay worth something", () => {
    const sparkly = Object.entries(RESPONSES).filter(([, r]) => r.sparkle);
    expect(sparkly.map(([m]) => m)).toEqual(["good"]);
  });

  it("gives sad and stressed different poses", () => {
    // They were both the upright sit, which made them the same cat with different captions.
    expect(RESPONSES.sad.pose).not.toBe(RESPONSES.stressed.pose);
  });
});

describe("her clock", () => {
  const at = (h: number) => Date.UTC(2026, 0, 15, h, 0, 0);
  const scene = (h: number, mood: Mood | null = null) =>
    sceneFor({ tz: "UTC", homeHour: 18 }, at(h), mood);

  it("reads the local hour in her zone, not the server's", () => {
    expect(hourIn("UTC", at(9))).toBeCloseTo(9, 5);
    expect(hourIn("Etc/GMT+12", at(9))).toBeCloseTo(21, 5); // UTC-12, so previous day 21:00
  });

  it("is brightest mid-afternoon and dark at night", () => {
    expect(scene(15).sun).toBeGreaterThan(scene(11).sun);
    expect(scene(15).sun).toBeGreaterThan(0.9);
    expect(scene(2).sun).toBeLessThan(0.1);
    expect(scene(23).sun).toBeLessThan(0.2);
  });

  it("gives each part of the day an authored lighting chapter", () => {
    expect([2, 6, 12, 18, 21, 23].map(lightPhaseAt)).toEqual([
      "night", "dawn", "day", "golden", "evening", "night",
    ]);
    expect(scene(6).lightPhase).toBe("dawn");
    expect(scene(18).lightPhase).toBe("golden");
    expect(scene(23).lightPhase).toBe("night");
  });

  it("does not paint a warm sun patch through the room at night", () => {
    expect(scene(2).litWall).toBe(scene(2).wallTop);
    expect(scene(2).litFloor).toBe(scene(2).floorNear);
    expect(scene(2).patch).toBe(scene(2).floorNear);
  });

  it("moves the sunbeam across the room over the day", () => {
    expect(scene(8).beam).toBeLessThan(scene(12).beam);
    expect(scene(12).beam).toBeLessThan(scene(18).beam);
  });

  it("puts her at the door in the hour before she's home", () => {
    expect(scene(17.5).atDoor).toBe(true);
    expect(scene(12).atDoor).toBe(false);
    expect(scene(21).atDoor).toBe(false);
  });

  it("has her fast asleep in the mid-afternoon patch", () => {
    expect(scene(14).sleepy).toBe(1);
    expect(scene(14).eyes).toBe(0);
  });

  it("keeps her awake at dawn even though the light is low", () => {
    // Her eyes have to agree with the copy, which says she's watching the window.
    expect(scene(6).sleepy).toBeLessThan(0.2);
  });

  it("returns a valid colour for every hour", () => {
    const hex = /^#[0-9a-f]{6}$/i;
    for (let h = 0; h < 24; h += 0.25) {
      const s = scene(h);
      for (const c of [s.wallTop, s.wallBottom, s.floorNear, s.floorFar, s.beamWarm, s.litWall, s.litFloor, s.patch]) {
        expect(c, `hour ${h}`).toMatch(hex);
      }
      expect(s.sun).toBeGreaterThanOrEqual(0);
      expect(s.sun).toBeLessThanOrEqual(1);
      expect(s.beam).toBeGreaterThanOrEqual(0);
      expect(s.beam).toBeLessThanOrEqual(1);
    }
  });

  it("lets what she told the cat outrank the time of day", () => {
    // Otherwise "bored" leaves her at the door at 5pm while the caption says she's at the shelf.
    const bored = scene(17.5, "bored");
    expect(bored.atDoor).toBe(false);
    expect(bored.pose).toBe("play");
  });

  it("never lets a mood darken the room, only the clock", () => {
    for (const m of MOODS) {
      expect(scene(15, m.id).sun).toBe(scene(15).sun);
      expect(scene(15, m.id).wallTop).toBe(scene(15).wallTop);
    }
  });
});

describe("the setup form", () => {
  it("offers only valid hex colours", () => {
    const hex = /^#[0-9a-f]{6}$/i;
    for (const l of LOOKS) for (const c of [l.cat.fur, l.cat.furDk, l.cat.belly]) expect(c).toMatch(hex);
    for (const e of EYES) expect(e.hex).toMatch(hex);
  });

  it("has no duplicate presets, so two swatches can't look identical", () => {
    expect(new Set(LOOKS.map((l) => l.cat.fur)).size).toBe(LOOKS.length);
    expect(new Set(EYES.map((e) => e.hex)).size).toBe(EYES.length);
  });

  it("lists her timezone options without duplicates, local zone first", () => {
    const zs = timezones();
    expect(zs.length).toBeGreaterThan(10);
    expect(new Set(zs).size).toBe(zs.length);
    expect(zs[0]).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    for (const z of zs.slice(0, 20)) expect(() => new Intl.DateTimeFormat("en", { timeZone: z })).not.toThrow();
  });
});
