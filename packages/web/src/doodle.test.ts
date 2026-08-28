import { describe, expect, it } from "vitest";
import { BLANK, DOODLE_CELLS, DOODLE_H, DOODLE_INK, cellAt, isBlank, widen, withCell } from "./doodle.js";

describe("the shape of a drawing", () => {
  // The worker checks against a literal 35 rather than importing this, because validation that
  // imports its own bound is not validation. This test is the tripwire: change the grid and it fails,
  // which is the reminder to change the worker's regex too.
  it("is a hundred and thirty-five cells, which is what the worker's regex allows", () => {
    expect(DOODLE_CELLS).toBe(135);
    expect(BLANK).toHaveLength(135);
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
   * There are drawings hanging in real rooms, and the sheet has now grown twice: seven by five, then
   * eleven by seven, now fifteen by nine. Every past size has to keep working, because a room nobody
   * has opened in a year still holds whatever it held.
   */
  const drawnOn = (w: number, h: number) => {
    const cells = Array.from({ length: w * h }, () => "0");
    cells[0] = "1";
    cells[w * h - 1] = "3";
    return cells.join("");
  };

  it("keeps a seven-by-five drawing, centred", () => {
    const wide = widen(drawnOn(7, 5));
    expect(wide).toHaveLength(DOODLE_CELLS);
    expect(cellAt(wide, 4, 2)).toBe(1);
    expect(cellAt(wide, 10, 6)).toBe(3);
    expect(wide.replace(/0/g, "")).toBe("13");
  });

  it("keeps an eleven-by-seven drawing, centred", () => {
    const wide = widen(drawnOn(11, 7));
    expect(wide).toHaveLength(DOODLE_CELLS);
    expect(cellAt(wide, 2, 1)).toBe(1);
    expect(cellAt(wide, 12, 7)).toBe(3);
    expect(wide.replace(/0/g, "")).toBe("13");
  });

  it("leaves a drawing that is already the new size alone", () => {
    const made = withCell(BLANK, 4, 4, 2);
    expect(widen(made)).toBe(made);
  });

  it("leaves something that is not a drawing at all alone", () => {
    expect(widen("nonsense")).toBe("nonsense");
  });
});
