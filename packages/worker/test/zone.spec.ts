import { describe, expect, it } from "vitest";
import { hourInZone, localDayNumber } from "../src/zone.js";

const NY = "America/New_York";

describe("her clock", () => {
  it("reads minutes as a fraction of the hour", () => {
    expect(hourInZone(Date.parse("2026-01-15T23:30:00Z"), NY)).toBe(18.5);
  });

  it("reads midnight as the start of the day", () => {
    expect(hourInZone(Date.parse("2026-01-15T05:00:00Z"), NY)).toBe(0);
  });

  it("is her zone and not the server's", () => {
    const at = Date.parse("2026-01-15T02:00:00Z");
    expect(hourInZone(at, NY)).toBe(21);
    expect(hourInZone(at, "UTC")).toBe(2);
  });

  it("counts a day as her day, so late evening is still today", () => {
    const evening = Date.parse("2026-01-16T02:00:00Z");
    expect(localDayNumber(evening, NY)).toBe(localDayNumber(Date.parse("2026-01-15T18:00:00Z"), NY));
    expect(localDayNumber(evening, "UTC")).toBe(localDayNumber(evening, NY) + 1);
  });

  it("subtracts to a number of days, which is what everything else compares on", () => {
    const day = (s: string) => localDayNumber(Date.parse(s), NY);
    expect(day("2026-01-20T17:00:00Z") - day("2026-01-15T17:00:00Z")).toBe(5);
    // Across a spring-forward boundary, where a naive /86400000 loses an hour and drops a day.
    expect(day("2026-03-10T17:00:00Z") - day("2026-03-07T17:00:00Z")).toBe(3);
  });
});
