import { describe, expect, it } from "vitest";
import { chromeFor } from "./App.js";
import { sceneFor } from "./hours.js";
import { contrast } from "./legible.js";
import readme from "../../../README.md?raw";

const CLOCK = { tz: "UTC", homeHour: 20 };

/** Every hour of the day, as the room actually draws it. */
const HOURS = Array.from({ length: 24 }, (_, h) => ({
  hour: h,
  chrome: chromeFor(sceneFor(CLOCK, Date.UTC(2026, 3, 2, h, 0, 0))),
}));

/* Text and the surface it is written on. The chrome is retinted every hour, so one spot check
   proves nothing: the bad case is whichever hour drags a surface through mid grey. */
const PAIRS: [string, string][] = [
  ["--ink", "--panel"],
  ["--soft", "--panel"],
  ["--error", "--panel"],
  ["--ink", "--air"],
  ["--soft", "--air"],
  ["--ink", "--air-warm"],
  ["--soft", "--air-warm"],
];

describe("text you can read at any hour", () => {
  it("clears 4.5:1 everywhere text meets a surface, around the whole clock", () => {
    const bad: string[] = [];
    for (const { hour, chrome } of HOURS) {
      for (const [fg, bg] of PAIRS) {
        const ratio = contrast(chrome[fg]!, chrome[bg]!);
        if (ratio < 4.5) bad.push(`${hour}:00 ${fg} on ${bg} = ${ratio.toFixed(2)}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("keeps the number written down in README.md true", () => {
    /*
     * The README states the worst ratio to two decimals. A number in prose has no way of being
     * wrong out loud, so it drifts: it said 4.54 while the palette had moved to 4.53.
     *
     * This asserts the doc against the code rather than against a constant, so retinting the
     * chrome fails here and the fix is to write the new number down.
     */
    const worst = Math.min(
      ...HOURS.flatMap(({ chrome }) => PAIRS.map(([fg, bg]) => contrast(chrome[fg]!, chrome[bg]!))),
    );
    const claimed = readme.match(/the worst ratio anywhere is (\d+\.\d+)/)?.[1];
    expect(claimed, "README.md no longer states a worst ratio").toBeDefined();
    expect(worst.toFixed(2)).toBe(claimed);
  });
});
