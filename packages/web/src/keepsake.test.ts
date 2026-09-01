import { describe, expect, it } from "vitest";
import { keepsakeCaption, keepsakeDate } from "./keepsake.js";

describe("keepsake copy", () => {
  it("remembers rare time together instead of reducing it to the cat pose", () => {
    expect(keepsakeCaption({ catName: "Mochi", doing: "watching the rain", together: true })).toBe(
      "for a little while, you were both here with Mochi.",
    );
  });

  it("describes an ordinary captured room in the past tense", () => {
    expect(keepsakeCaption({ catName: "Bean", doing: "asleep in the best spot", together: false })).toBe(
      "Bean was asleep in the best spot.",
    );
  });

  it("formats the day as keepsake copy rather than a timestamp", () => {
    expect(keepsakeDate(new Date(2026, 7, 11))).toMatch(/August 11, 2026/);
  });
});

describe("the postcard she keeps", () => {
  const base = { catName: "Bean", doing: "asleep in the sun", together: false };

  it("does not caption her own picture with her name in the third person", () => {
    // This is the one thing in the app designed to leave the app, so it is the one most likely to
    // be seen by somebody who has no idea she is the cat.
    expect(keepsakeCaption({ ...base, youAreHer: true })).toBe("you were asleep in the sun.");
    expect(keepsakeCaption(base)).toBe("Bean was asleep in the sun.");
  });

  it("does not tell her she was here with herself", () => {
    expect(keepsakeCaption({ ...base, together: true, youAreHer: true })).not.toMatch(/Bean/);
    expect(keepsakeCaption({ ...base, together: true })).toMatch(/Bean/);
  });
});
