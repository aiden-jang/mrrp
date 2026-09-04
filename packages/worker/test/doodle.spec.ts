import { describe, expect, it } from "vitest";
import { DOODLE_CELLS, DOODLE_H, DOODLE_W, widenDoodle } from "../src/doodle.js";

const grid = (w: number, h: number, at: [number, number]) =>
  Array.from({ length: w * h }, (_, i) => (i === at[1] * w + at[0] ? "3" : "0")).join("");

describe("an old drawing on today's sheet", () => {
  it("leaves a drawing already the current size exactly as it was", () => {
    const now = grid(DOODLE_W, DOODLE_H, [4, 2]);
    expect(widenDoodle(now)).toBe(now);
  });

  it("re-centres every size the sheet has ever been", () => {
    // Middle of the old sheet lands in the middle of the new one, whatever the old size was.
    for (const [w, h] of [
      [7, 5],
      [11, 7],
    ] as const) {
      const out = widenDoodle(grid(w, h, [(w - 1) / 2, (h - 1) / 2]));
      expect(out).toHaveLength(DOODLE_CELLS);
      expect(out.indexOf("3")).toBe(((DOODLE_H - 1) / 2) * DOODLE_W + (DOODLE_W - 1) / 2);
    }
  });

  it("keeps every mark, not just the middle one", () => {
    const every = "1".repeat(7 * 5);
    expect(widenDoodle(every).split("1").length - 1).toBe(35);
  });

  it("hands back anything it does not recognise, rather than guessing a width", () => {
    expect(widenDoodle("0000")).toBe("0000");
    expect(widenDoodle("")).toBe("");
  });
});
