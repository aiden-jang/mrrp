import { describe, expect, it } from "vitest";
import { MOTH_CYCLE_MS, MOTH_SPREAD, MOTH_VISIT_MS, fireflyAt, mothAt } from "./critters.js";

/**
 * Moth timing, checked by arithmetic rather than by screenshot.
 *
 * It visits for 18 seconds out of every 100. I tried twice to catch that in a screenshot and missed both
 * times, because the gap between deciding to look and actually looking is longer than you'd think. This
 * is the lesson from the blink timing repeated: if a thing is only true for a fraction of the time, test
 * the fraction, don't hunt for it.
 */

const BEAM = 50;

describe("the moth", () => {
  it("visits at the start of a cycle and leaves for the rest of it", () => {
    expect(mothAt(0, BEAM)).not.toBeNull();
    expect(mothAt(MOTH_VISIT_MS - 1, BEAM)).not.toBeNull();
    expect(mothAt(MOTH_VISIT_MS, BEAM)).toBeNull();
    expect(mothAt(MOTH_CYCLE_MS - 1, BEAM)).toBeNull();
  });

  it("comes back every cycle", () => {
    for (let n = 0; n < 5; n++) {
      expect(mothAt(n * MOTH_CYCLE_MS + 500, BEAM), `cycle ${n}`).not.toBeNull();
      expect(mothAt(n * MOTH_CYCLE_MS + MOTH_VISIT_MS + 500, BEAM), `cycle ${n} gap`).toBeNull();
    }
  });

  it("is present for roughly a sixth of the time, not most of it or none of it", () => {
    // A moth that is always there is furniture; one that is never there is dead code.
    let seen = 0;
    const step = 250;
    for (let t = 0; t < MOTH_CYCLE_MS * 4; t += step) if (mothAt(t, BEAM)) seen++;
    const share = seen / (MOTH_CYCLE_MS * 4 / step);
    expect(share).toBeGreaterThan(0.12);
    expect(share).toBeLessThan(0.24);
  });

  it("never drifts outside the beam", () => {
    // Outside the shaft it is a stray pixel on a wall, which reads as a rendering fault.
    for (let t = 0; t < MOTH_VISIT_MS; t += 100) {
      const m = mothAt(t, BEAM)!;
      expect(Math.abs(m.x - BEAM)).toBeLessThanOrEqual(MOTH_SPREAD + 0.001);
    }
  });

  it("stays in the upper part of the room, above the floor", () => {
    // FLOOR is 48 on the 100x80 grid; a moth walking along the boards is not a moth.
    for (let t = 0; t < MOTH_VISIT_MS; t += 100) {
      const m = mothAt(t, BEAM)!;
      expect(m.y).toBeGreaterThan(8);
      expect(m.y).toBeLessThan(44);
    }
  });

  it("fades in and out instead of popping", () => {
    expect(mothAt(0, BEAM)!.presence).toBeCloseTo(0, 2);
    expect(mothAt(MOTH_VISIT_MS / 2, BEAM)!.presence).toBeCloseTo(1, 2);
    expect(mothAt(MOTH_VISIT_MS - 1, BEAM)!.presence).toBeLessThan(0.01);
  });

  it("moves: it is not a stationary dot", () => {
    const xs = new Set<number>();
    for (let t = 0; t < MOTH_VISIT_MS; t += 500) xs.add(Math.round(mothAt(t, BEAM)!.x));
    expect(xs.size).toBeGreaterThan(6);
  });

  it("follows the beam wherever it is", () => {
    for (const beam of [10, 50, 90]) {
      const m = mothAt(3000, beam)!;
      expect(Math.abs(m.x - beam)).toBeLessThanOrEqual(MOTH_SPREAD + 0.001);
    }
  });

  it("survives a negative clock without vanishing forever", () => {
    // performance.now() is never negative, but a caller doing arithmetic on it might be.
    expect(() => mothAt(-500, BEAM)).not.toThrow();
  });
});

describe("the firefly", () => {
  it("visits briefly, then leaves the night room alone", () => {
    expect(fireflyAt(0)).not.toBeNull();
    expect(fireflyAt(14_999)).not.toBeNull();
    expect(fireflyAt(15_000)).toBeNull();
  });

  it("fades at the edges of its visit", () => {
    expect(fireflyAt(0)!.presence).toBeCloseTo(0, 2);
    expect(fireflyAt(7_500)!.presence).toBeCloseTo(1, 2);
  });
});
