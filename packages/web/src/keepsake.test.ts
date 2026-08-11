import { describe, expect, it } from "vitest";
import { keepsakeCaption, keepsakeDate } from "./keepsake.js";

describe("keepsake copy", () => {
  it("remembers rare time together instead of reducing it to the cat pose", () => {
    expect(keepsakeCaption({ catName: "Mochi", doing: "watching the rain", together: true }))
      .toBe("for a little while, you were both here with Mochi.");
  });

  it("describes an ordinary captured room in the past tense", () => {
    expect(keepsakeCaption({ catName: "Bean", doing: "asleep in the best spot", together: false }))
      .toBe("Bean was asleep in the best spot.");
  });

  it("formats the day as keepsake copy rather than a timestamp", () => {
    expect(keepsakeDate(new Date(2026, 7, 11))).toMatch(/August 11, 2026/);
  });
});
