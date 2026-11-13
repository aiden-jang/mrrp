import { describe, expect, it } from "vitest";
import { keepsakeCaption, keepsakeDate, keepsakeImageBounds } from "./keepsake.js";

describe("keepsake copy", () => {
  it("remembers rare time together instead of reducing it to the cat pose", () => {
    expect(keepsakeCaption({ catName: "Mochi", together: true })).toBe(
      "for a little while, you were both here with Mochi.",
    );
  });

  it("describes the captured room without guessing the animation pose", () => {
    expect(keepsakeCaption({ catName: "Bean", together: false })).toBe("A little moment in Bean’s room.");
  });

  it("formats the day as keepsake copy rather than a timestamp", () => {
    expect(keepsakeDate(new Date(2026, 7, 11))).toMatch(/August 11, 2026/);
  });
});

describe("the postcard she keeps", () => {
  const base = { catName: "Bean", together: false };

  it("does not caption her own picture with her name in the third person", () => {
    // This is the one thing in the app designed to leave the app, so it is the one most likely to
    // be seen by somebody who has no idea she is the cat.
    expect(keepsakeCaption({ ...base, youAreHer: true })).toBe("A little moment in your room.");
    expect(keepsakeCaption(base)).toBe("A little moment in Bean’s room.");
  });

  it("does not tell her she was here with herself", () => {
    expect(keepsakeCaption({ ...base, together: true, youAreHer: true })).not.toMatch(/Bean/);
    expect(keepsakeCaption({ ...base, together: true })).toMatch(/Bean/);
  });
});

describe("the room inside the postcard", () => {
  it.each([
    [1200, 960],
    [480, 640],
    [480, 480],
  ])("preserves a %s by %s scene without stretching", (width, height) => {
    const bounds = keepsakeImageBounds(width, height);
    expect(bounds.width / bounds.height).toBeCloseTo(width / height);
    expect(bounds.x).toBeGreaterThanOrEqual(72);
    expect(bounds.y).toBeGreaterThanOrEqual(72);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(1128);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(1128);
    expect(bounds.x + bounds.width / 2).toBe(600);
    expect(bounds.y).toBe(72);
  });
});
