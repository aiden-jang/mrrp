import { describe, expect, it } from "vitest";
import { markLives } from "./marks.js";

const HOUR = 3_600_000;
const NIGHT = Date.parse("2026-04-02T23:00:00Z");

describe("how long a mark stays in the room", () => {
  it("is there all of the day it was left on", () => {
    expect(markLives({ day: 7, at: NIGHT }, 7, NIGHT + HOUR)).toBe(true);
  });

  it("outlives her midnight if she has not looked since", () => {
    // Left at eleven at night, she opens the room at nine the next morning. Under the day rule alone
    // this was gone within the hour, which is the case the whole thing exists for.
    expect(markLives({ day: 7, at: NIGHT }, 8, NIGHT - HOUR)).toBe(true);
  });

  it("goes once she has been in and seen it, on a later day", () => {
    expect(markLives({ day: 7, at: NIGHT }, 8, NIGHT + HOUR)).toBe(false);
  });

  it("is not there when nothing was left", () => {
    expect(markLives(undefined, 8, NIGHT)).toBe(false);
  });
});
