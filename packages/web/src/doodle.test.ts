import { describe, expect, it } from "vitest";
import { BLANK, cellAt, DOODLE_CELLS, DOODLE_INK, isBlank, withCell } from "./doodle.js";

describe("the shape of a drawing", () => {
  // The worker checks against a literal 35 rather than importing this, because validation that
  // imports its own bound is not validation. This test is the tripwire: change the grid and it fails,
  // which is the reminder to change the worker's regex too.
  it("is thirty-five cells, which is what the worker's regex allows", () => {
    expect(DOODLE_CELLS).toBe(35);
    expect(BLANK).toHaveLength(35);
  });

  it("has an ink for every index the regex permits", () => {
    expect(DOODLE_INK).toHaveLength(5);
    for (let i = 1; i < DOODLE_INK.length; i++) expect(DOODLE_INK[i]).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("painting a cell", () => {
  it("puts the ink where the row and column say, and nowhere else", () => {
    const one = withCell(BLANK, 3, 2, 4);
    expect(cellAt(one, 3, 2)).toBe(4);
    expect(one).toHaveLength(DOODLE_CELLS);
    expect(one.replace(/0/g, "")).toBe("4");
  });

  it("leaves the sheet alone when the cell is off it", () => {
    expect(withCell(BLANK, -1, 0, 2)).toBe(BLANK);
    expect(withCell(BLANK, 0, 5, 2)).toBe(BLANK);
  });
});

describe("an empty sheet", () => {
  it("is blank whether it was never drawn on or rubbed out again", () => {
    expect(isBlank(BLANK)).toBe(true);
    expect(isBlank(withCell(withCell(BLANK, 1, 1, 3), 1, 1, 0))).toBe(true);
    expect(isBlank(withCell(BLANK, 1, 1, 1))).toBe(false);
  });
});
