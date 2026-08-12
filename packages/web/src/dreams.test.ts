import { describe, expect, it } from "vitest";
import type { DiscoveryKey } from "./discoveries.js";
import { dreamOf, type DreamContext } from "./dreams.js";

/*
 * The dream is the softest surface in the app, which is exactly why the spoiler rule is tested hardest
 * here. Every other place that could name a secret is obviously a place that names secrets; a cat
 * sleeping is not, and a leak through it would look like a nice touch rather than a bug.
 */

const ctx = (over: Partial<DreamContext> = {}): DreamContext => ({
  found: [],
  recent: [],
  trait: null,
  framed: false,
  hasBox: false,
  ...over,
});

const ALL_KEYS: DiscoveryKey[] = [
  "constellation", "roomTour", "piano", "bubbles", "aurora", "mrrp",
  "summon", "herName", "box", "yarn", "treat", "catnip", "music", "mouse",
];

/** Every line the module can produce for a given context, across seeds. */
const linesFor = (context: DreamContext): string[] =>
  [...new Set(Array.from({ length: 40 }, (_, seed) => dreamOf(context, seed).line))];

describe("the spoiler rule", () => {
  /*
   * The one that matters.
   *
   * discoveries.ts refuses to name a secret the viewer has not found, because walking into one is the
   * whole pleasure. A dream naming the piano tells somebody there is a piano.
   */
  it("never dreams about a secret this person has not found", () => {
    const naive = linesFor(ctx());
    for (const line of naive) {
      expect(line, line).not.toMatch(/piano|mouse|star|box/i);
    }
  });

  it("dreams about one only once it has been found", () => {
    expect(linesFor(ctx({ found: ["piano"] })).join(' ')).toMatch(/piano/i);
    expect(linesFor(ctx({ found: ["mouse"] })).join(' ')).toMatch(/mouse/i);
  });

  it("leaks nothing when one secret is found and the others are not", () => {
    const lines = linesFor(ctx({ found: ["mouse"] })).join(' ');
    expect(lines).toMatch(/mouse/i);
    expect(lines).not.toMatch(/piano|star/i);
  });

  it("holds for every key the room knows", () => {
    // Rather than the handful with pictures: a key added later must not become dreamable by default.
    for (const key of ALL_KEYS) {
      const without = ALL_KEYS.filter((other) => other !== key);
      const lines = linesFor(ctx({ found: without })).join(' ');
      const own = linesFor(ctx({ found: [key] }));
      // Anything unique to `key` must not show up when only the others are found.
      for (const line of own) {
        if (!linesFor(ctx({ found: without })).includes(line)) {
          expect(lines, `${key} leaked`).not.toContain(line);
        }
      }
    }
  });

  it('treats a box in the room as visible, not as a secret', () => {
    // It is physically there for both of them, so dreaming it gives nothing away.
    expect(linesFor(ctx({ hasBox: true })).join(' ')).toMatch(/box/i);
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
    expect(lines.join(' ')).toMatch(/brushed/);
    expect(lines.join(' ')).not.toMatch(/a fish, probably/);
  });

  it("uses what she has come to expect when nothing happened lately", () => {
    expect(linesFor(ctx({ trait: "fed" })).join(' ')).toMatch(/food/);
  });

  it("varies between naps rather than showing one picture forever", () => {
    const many = linesFor(ctx({ found: ["piano", "mouse"], recent: ["brush"] }));
    expect(many.length).toBeGreaterThan(1);
  });

  it("does not make a repeated dream twice as likely", () => {
    /*
     * Brushed lately and brushed always reach the same line, so without deduping it sits in the pool
     * twice and comes up two naps in three. The set of possible dreams is identical either way, which
     * is why this counts them instead.
     */
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
    /*
     * performance.now() is fractional, and a stray subtraction makes it negative. -1 rather than a
     * multiple of the pool length: `-3 % 3` is -0, which indexes fine and hides a missing Math.abs.
     */
    for (const seed of [-1, -2, -3.7, -7.5, 1e9 + 0.5]) {
      expect(dreamOf(ctx(), seed).line, String(seed)).toBeTruthy();
      expect(dreamOf(ctx({ found: ["mouse", "piano"] }), seed).line, String(seed)).toBeTruthy();
    }
  });
});

describe("the voice", () => {
  const everything = ctx({
    found: ALL_KEYS,
    recent: ["brush", "bring", "photo"],
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
