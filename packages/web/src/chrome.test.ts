import { describe, expect, it } from "vitest";
import { chromeFor } from "./roomTheme.js";
import { sceneFor } from "./hours.js";
import { contrast } from "./legible.js";
import decisions from "../../../DECISIONS.md?raw";

const CLOCK = { tz: "UTC", homeHour: 20 };

const MOMENTS = Array.from({ length: 1440 }, (_, minute) => ({
  time: `${Math.floor(minute / 60)}:${String(minute % 60).padStart(2, "0")}`,
  chrome: chromeFor(sceneFor(CLOCK, Date.UTC(2026, 3, 2, 0, minute, 0))),
}));

/* Text and the surface it is written on. The chrome is retinted every hour, so one spot check
   proves nothing: the bad case is whichever hour drags a surface through mid grey. */
const PAIRS: [string, string][] = [
  ["--ink", "--panel"],
  ["--soft", "--panel"],
  ["--error", "--panel"],
  ["--ink", "--air"],
  ["--soft", "--air"],
  ["--error", "--air"],
  ["--ink", "--air-warm"],
  ["--soft", "--air-warm"],
  ["--error", "--air-warm"],
];

describe("text you can read at any hour", () => {
  it("clears 4.5:1 everywhere text meets a surface, around the whole clock", () => {
    const bad: string[] = [];
    for (const { time, chrome } of MOMENTS) {
      for (const [fg, bg] of PAIRS) {
        const ratio = contrast(chrome[fg]!, chrome[bg]!);
        if (ratio < 4.5) bad.push(`${time} ${fg} on ${bg} = ${ratio.toFixed(2)}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("keeps the number written down in DECISIONS.md true", () => {
    /*
     * The doc states the worst ratio to two decimals. A number in prose has no way of being wrong
     * out loud, so it drifts: it said 4.54 while the palette had moved to 4.53.
     *
     * This asserts the doc against the code rather than against a constant, so retinting the
     * chrome fails here and the fix is to write the new number down.
     */
    const worst = Math.min(
      ...MOMENTS.flatMap(({ chrome }) => PAIRS.map(([fg, bg]) => contrast(chrome[fg]!, chrome[bg]!))),
    );
    const claimed = decisions.match(/the worst ratio anywhere is (\d+\.\d+)/)?.[1];
    expect(claimed, "DECISIONS.md no longer states a worst ratio").toBeDefined();
    expect(worst.toFixed(2)).toBe(claimed);
  });
});
