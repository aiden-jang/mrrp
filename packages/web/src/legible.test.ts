import { describe, expect, it } from "vitest";
import { contrast, legible, standOff } from "./legible.js";

/** The floor at noon, afternoon, dusk, evening and the small hours. */
const FLOORS = ["#c4918a", "#b98c81", "#8a6a68", "#6d5450", "#3b3243", "#2c2636"];

describe("marks you can actually see", () => {
  it("clears 3:1 on the floor at every hour of the day", () => {
    // Three to one is the bar for a graphical object. The dent used to sit at 1.18:1, which is why
    // "I don't see anything in the room" survived every other fix.
    for (const floor of FLOORS) {
      expect(contrast(legible(floor), floor), `floor ${floor}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("goes light on a mid-toned floor, where going dark cannot get there", () => {
    // Dusk is the case that forces the choice: ink only reaches 2.02:1 from this one.
    expect(contrast(legible("#8a6a68"), "#8a6a68")).toBeGreaterThanOrEqual(3);
    expect(contrast("#4a3520", "#8a6a68")).toBeLessThan(3);
  });

  it("agrees with the contrast numbers everyone else uses", () => {
    expect(contrast("#ffffff", "#000000")).toBeCloseTo(21, 1);
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 1);
  });
});

describe("outlines that can be seen without shouting", () => {
  it("clears 3:1 on the panel at every hour, day and night", () => {
    // The chrome is tinted per hour off the wall colour, so a fixed hex holds for part of the day.
    for (const panel of ["#fffaf0", "#fdf3e4", "#efe0d2", "#3a3346", "#272232"]) {
      expect(contrast(standOff(panel), panel), `panel ${panel}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("takes no more of the palette than it has to", () => {
    // A one pixel outline wants exactly enough. `legible` jumps to 0.82 and would box every control.
    const panel = "#fffaf0";
    expect(contrast(standOff(panel), panel)).toBeLessThan(contrast(legible(panel), panel));
  });
});
