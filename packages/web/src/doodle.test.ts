import { describe, expect, it } from "vitest";
import {
  BLANK,
  DOODLE_CELLS,
  DOODLE_H,
  DOODLE_INK,
  OLD_CELLS,
  cellAt,
  isBlank,
  widen,
  withCell,
} from "./doodle.js";

describe("the shape of a drawing", () => {
  // The worker checks against a literal 35 rather than importing this, because validation that
  // imports its own bound is not validation. This test is the tripwire: change the grid and it fails,
  // which is the reminder to change the worker's regex too.
  it("is seventy-seven cells, which is what the worker's regex allows", () => {
    expect(DOODLE_CELLS).toBe(77);
    expect(BLANK).toHaveLength(77);
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
    expect(withCell(BLANK, 0, DOODLE_H, 2)).toBe(BLANK);
  });
});

describe("an empty sheet", () => {
  it("is blank whether it was never drawn on or rubbed out again", () => {
    expect(isBlank(BLANK)).toBe(true);
    expect(isBlank(withCell(withCell(BLANK, 1, 1, 3), 1, 1, 0))).toBe(true);
    expect(isBlank(withCell(BLANK, 1, 1, 1))).toBe(false);
  });
});

describe("a drawing made when the sheet was smaller", () => {
  /*
   * There are drawings hanging in real rooms. The sheet grew from seven by five to eleven by seven,
   * and doing that without this would have blanked every one of them.
   */
  it("keeps what was drawn, centred in the bigger sheet", () => {
    const old = "0".repeat(OLD_CELLS).split("");
    old[0] = "1";
    old[34] = "3";
    const wide = widen(old.join(""));

    expect(wide).toHaveLength(DOODLE_CELLS);
    // Old (0,0) lands at (2,1), and old (6,4) at (8,5).
    expect(cellAt(wide, 2, 1)).toBe(1);
    expect(cellAt(wide, 8, 5)).toBe(3);
    expect(wide.replace(/0/g, "")).toBe("13");
  });

  it("leaves a drawing that is already the new size alone", () => {
    const made = withCell(BLANK, 4, 4, 2);
    expect(widen(made)).toBe(made);
  });
});
