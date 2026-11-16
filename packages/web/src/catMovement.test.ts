import { describe, expect, it } from "vitest";
import { boundCatTarget, moveCat } from "./catMovement.js";
import { POSES } from "./sprites.js";

describe("cat travel", () => {
  it.each([false, true])("takes the same time at different refresh rates with fast=%s", (fast) => {
    const positions = [30, 60, 144].map((fps) => {
      let x = 20;
      const duration = fast ? 100 : 600;
      let previous = 0;
      for (let at = 1000 / fps; at < duration; at += 1000 / fps) {
        x = moveCat(x, 70, at - previous, fast);
        previous = at;
      }
      return moveCat(x, 70, duration - previous, fast);
    });
    expect(positions[0]).toBeGreaterThan(20);
    expect(positions[0]).toBeLessThan(70);
    expect(Math.max(...positions) - Math.min(...positions)).toBeLessThan(0.000001);
  });

  it.each([
    [20, 70],
    [70, 20],
  ])("slows down from %s to %s and stops without overshooting", (start, target) => {
    let x = start;
    let previousStep = Infinity;
    for (let frame = 0; frame < 150; frame++) {
      const next = moveCat(x, target, 1000 / 60, false);
      expect(next).toBeGreaterThanOrEqual(Math.min(start, target));
      expect(next).toBeLessThanOrEqual(Math.max(start, target));
      if (next !== target) expect(Math.abs(next - x)).toBeLessThanOrEqual(previousStep + 0.000001);
      previousStep = Math.abs(next - x);
      x = next;
    }
    expect(x).toBe(target);
    expect(moveCat(x, target, 1000 / 60, false)).toBe(target);
  });

  it("can reverse immediately and limits catch-up after an interrupted frame", () => {
    const x = moveCat(20, 70, 100, false);
    expect(moveCat(x, 15, 16, false)).toBeLessThan(x);
    expect(moveCat(x, 70, 60_000, false)).toBe(moveCat(x, 70, 250, false));
    expect(moveCat(x, 70, 0, false)).toBe(x);
    expect(moveCat(x, 70, 16, true)).toBeGreaterThan(moveCat(x, 70, 16, false));
  });

  it("keeps every pose within the room at either destination", () => {
    for (const pose of Object.values(POSES)) {
      expect(boundCatTarget(-100) + pose.ox).toBeGreaterThanOrEqual(0);
      expect(boundCatTarget(200) + pose.ox + pose.w).toBeLessThanOrEqual(100);
    }
  });
});
