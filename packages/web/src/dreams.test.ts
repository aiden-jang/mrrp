import { describe, expect, it } from "vitest";
import type { DiscoveryKey } from "./discoveries.js";
import { dreamOf, type DreamContext } from "./dreams.js";

const ctx = (over: Partial<DreamContext> = {}): DreamContext => ({
  found: [],
  recent: [],
  trait: null,
  framed: false,
  hasBox: false,
  ...over,
});

const ALL_KEYS: DiscoveryKey[] = [
  "constellation",
  "roomTour",
  "piano",
  "bubbles",
  "aurora",
  "mrrp",
  "summon",
  "herName",
  "box",
  "yarn",
  "treat",
  "catnip",
  "music",
  "mouse",
];

const linesFor = (context: DreamContext): string[] => [
  ...new Set(Array.from({ length: 40 }, (_, seed) => dreamOf(context, seed).line)),
];

describe("the spoiler rule", () => {
  it("never dreams about a secret this person has not found", () => {
    const naive = linesFor(ctx());
    for (const line of naive) {
      expect(line, line).not.toMatch(/piano|mouse|star|box/i);
    }
  });

  it("dreams about one only once it has been found", () => {
    expect(linesFor(ctx({ found: ["piano"] })).join(" ")).toMatch(/piano/i);
    expect(linesFor(ctx({ found: ["mouse"] })).join(" ")).toMatch(/mouse/i);
  });

  it("leaks nothing when one secret is found and the others are not", () => {
    const lines = linesFor(ctx({ found: ["mouse"] })).join(" ");
    expect(lines).toMatch(/mouse/i);
    expect(lines).not.toMatch(/piano|star/i);
  });

  it("holds for every key the room knows", () => {
    for (const key of ALL_KEYS) {
      const without = ALL_KEYS.filter((other) => other !== key);
      const lines = linesFor(ctx({ found: without })).join(" ");
      const own = linesFor(ctx({ found: [key] }));
      for (const line of own) {
        if (!linesFor(ctx({ found: without })).includes(line)) {
          expect(lines, `${key} leaked`).not.toContain(line);
        }
      }
    }
  });

  it("treats a box in the room as visible, not as a secret", () => {
    expect(linesFor(ctx({ hasBox: true })).join(" ")).toMatch(/box/i);
  });
});

describe("what she dreams about", () => {
  it("always dreams something, even in a brand-new room", () => {
    const dream = dreamOf(ctx(), 0);
    expect(dream.line).toBeTruthy();
    expect(dream.scene).toBeTruthy();
  });

  it("prefers what actually happened over the generic ones", () => {
    const lines = linesFor(ctx({ recent: ["brush"] }));
    expect(lines.join(" ")).toMatch(/brushed/);
    expect(lines.join(" ")).not.toMatch(/a fish, probably/);
  });

  it("uses what she has come to expect when nothing happened lately", () => {
    expect(linesFor(ctx({ trait: "fed" })).join(" ")).toMatch(/food/);
  });

  it("varies between naps rather than showing one picture forever", () => {
    const many = linesFor(ctx({ found: ["piano", "mouse"], recent: ["brush"] }));
    expect(many.length).toBeGreaterThan(1);
  });

  it("does not make a repeated dream twice as likely", () => {
    const context = ctx({ recent: ["brush"], trait: "brushed", found: ["mouse"] });
    const lines = Array.from({ length: 60 }, (_, seed) => dreamOf(context, seed).line);
    const brushed = lines.filter((line) => /brushed/.test(line)).length;
    expect(brushed).toBe(30);
  });

  it("is the same dream for the same seed", () => {
    const context = ctx({ found: ["piano", "mouse"] });
    expect(dreamOf(context, 7)).toEqual(dreamOf(context, 7));
  });

  it("survives a seed that is negative or fractional", () => {
    for (const seed of [-1, -2, -3.7, -7.5, 1e9 + 0.5]) {
      expect(dreamOf(ctx(), seed).line, String(seed)).toBeTruthy();
      expect(dreamOf(ctx({ found: ["mouse", "piano"] }), seed).line, String(seed)).toBeTruthy();
    }
  });
});

describe("the voice", () => {
  const everything = ctx({
    found: ALL_KEYS,
    recent: ["brush", "leaveout", "photo"],
    trait: "petted",
    framed: true,
    hasBox: true,
  });

  it("never counts anything", () => {
    for (const line of [...linesFor(everything), ...linesFor(ctx())]) {
      expect(line, line).not.toMatch(/\d/);
    }
  });

  it("never tells anybody to do something", () => {
    for (const line of [...linesFor(everything), ...linesFor(ctx())]) {
      expect(line, line).not.toMatch(/tap|click|try|find|unlock|you should|keep going/i);
    }
  });

  it("stays lowercase and unexcited, like the rest of the room", () => {
    for (const line of [...linesFor(everything), ...linesFor(ctx())]) {
      expect(line, line).not.toContain("!");
      expect(line[0], line).toBe(line[0]!.toLowerCase());
    }
  });
});
