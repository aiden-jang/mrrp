import { describe, expect, it } from "vitest";
import { moonPhase, moonPixelLit } from "./moon.js";

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
  it("grows from the right and wanes toward the left", () => {
    expect([0, 1, 2, 3, 4].filter((x) => moonPixelLit(1, x))).toEqual([4]);
    expect([0, 1, 2, 3, 4].filter((x) => moonPixelLit(4, x))).toEqual([0, 1, 2, 3, 4]);
    expect([0, 1, 2, 3, 4].filter((x) => moonPixelLit(7, x))).toEqual([0]);
  });
});
