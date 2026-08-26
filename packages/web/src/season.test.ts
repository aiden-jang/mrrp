import { describe, expect, it } from "vitest";
import { seasonalPlantColors, seasonFor } from "./season.js";

describe("seasonFor", () => {
  it.each([
    ["2026-04-10", "spring"],
    ["2026-08-10", "summer"],
    ["2026-10-10", "autumn"],
    ["2026-01-10", "winter"],
  ] as const)("places %s in %s", (day, season) => {
    expect(seasonFor(new Date(`${day}T12:00:00`))).toBe(season);
  });

  it("gives every season a distinct plant palette", () => {
    const colors = (["spring", "summer", "autumn", "winter"] as const).map(
      (season) => seasonalPlantColors(season).leaf,
    );
    expect(new Set(colors).size).toBe(4);
  });
});
