import { describe, expect, it } from "vitest";
import { moonLine, moonPhase, moonPixelLit } from "./moon.js";

describe("moonPhase", () => {
  it("recognizes the anchor new moon and a full moon half a cycle later", () => {
    expect(moonPhase(new Date("2000-01-06T18:14:00Z")).name).toBe("new moon");
    expect(moonPhase(new Date("2000-01-21T12:36:00Z")).name).toBe("full moon");
  });

  it("wraps dates before the anchor into the same eight phases", () => {
    expect(moonPhase(new Date("1999-12-22T23:56:00Z")).name).toBe("full moon");
  });
});

describe("moonPixelLit", () => {
  const lit = (phase: number) => [0, 1, 2, 3, 4].filter((x) => moonPixelLit(phase, x));

  it("grows from the right and wanes toward the left", () => {
    // Every phase, because a shape that is only right at the ends is a moon that jumps.
    expect(lit(0), "new moon, nothing to see").toEqual([]);
    expect(lit(1)).toEqual([4]);
    expect(lit(2)).toEqual([2, 3, 4]);
    expect(lit(3)).toEqual([1, 2, 3, 4]);
    expect(lit(4), "full").toEqual([0, 1, 2, 3, 4]);
    expect(lit(5)).toEqual([0, 1, 2, 3]);
    expect(lit(6)).toEqual([0, 1, 2]);
    expect(lit(7)).toEqual([0]);
  });

  it("never shrinks on the way up or grows on the way down", () => {
    for (const p of [1, 2, 3]) expect(lit(p).length).toBeLessThan(lit(p + 1).length);
    for (const p of [4, 5, 6]) expect(lit(p).length).toBeGreaterThan(lit(p + 1).length);
  });
});

describe("moonLine", () => {
  const FULL = new Date("2000-01-21T12:36:00Z");
  const NEW = new Date("2000-01-06T18:14:00Z");

  it("is said on the full moon and on no other night", () => {
    expect(moonLine(FULL, "Bean", false)).toContain("full tonight");
    expect(moonLine(NEW, "Bean", false), "a new moon is not an occasion").toBeNull();
  });

  it("puts the moon in her window, whichever of them is reading", () => {
    expect(moonLine(FULL, "Bean", true)).toContain("your window");
    expect(moonLine(FULL, "Bean", false)).toContain("Bean's window");
  });
});
