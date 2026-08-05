import { describe, expect, it } from "vitest";
import { MOODS, type Mood } from "../src/types.js";
import { RESPONSES } from "../src/moods.js";
import { LOOKS, EYES, timezones } from "../src/looks.js";
import { POSES, BED, DOOR, FRAME, PLANT, SHELF, TAIL, WINDOW, type Sprite } from "../src/sprites.js";
import { sceneFor, hourIn } from "../src/hours.js";

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
];

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
