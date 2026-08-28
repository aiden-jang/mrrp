import { describe, expect, it } from "vitest";
import { placeFor, skyFor } from "./weather.js";

describe("reading a WMO code", () => {
  it("keeps snow and rain apart, including the showers at the top of the range", () => {
    expect(skyFor(71)).toBe("snow");
    expect(skyFor(86)).toBe("snow");
    expect(skyFor(61)).toBe("rain");
    expect(skyFor(82)).toBe("rain");
    expect(skyFor(95)).toBe("rain");
  });

  it("calls fog cloud, because a window cannot draw fog and cloud is nearly true", () => {
    expect(skyFor(45)).toBe("cloud");
    expect(skyFor(2)).toBe("cloud");
  });

  // A code it has never seen must not become weather. Showing her rain that is not happening is
  // worse than showing her nothing, because the window is the one part of the room that claims to
  // be about the real world.
  it("treats a clear sky and an unknown code the same way", () => {
    expect(skyFor(0)).toBe("clear");
    expect(skyFor(999)).toBe("clear");
    expect(skyFor(-1)).toBe("clear");
  });
});

describe("working out where to ask about", () => {
  it("knows the places the setup panel offers first", () => {
    expect(placeFor("Asia/Seoul")).toEqual([37.57, 126.98]);
    expect(placeFor("America/New_York")).toEqual([40.71, -74.01]);
  });

  // The fallback only has to land in the right part of the world, and this is the check that it does
  // rather than quietly returning zero for everywhere.
  it("puts an unlisted zone at roughly its own longitude", () => {
    const [, lon] = placeFor("America/Argentina/Cordoba");
    expect(lon).toBeLessThan(-30);
    expect(lon).toBeGreaterThan(-75);
  });

  it("does not throw on a timezone that does not exist", () => {
    expect(placeFor("Not/AZone")).toEqual([40, 0]);
  });
});
