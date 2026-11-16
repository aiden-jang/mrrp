// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { room, type Room } from "./canvasHarness.js";

let current: Room | null = null;
afterEach(() => {
  current?.unmount();
  current = null;
});

function furCells(y0: number, y1: number) {
  let count = 0;
  for (let y = y0; y <= y1; y++)
    for (let x = 0; x < 80; x++) {
      const color = current!.at(x, y);
      if (!color || !/^#[0-9a-f]{6}$/i.test(color)) continue;
      const r = parseInt(color.slice(1, 3), 16),
        g = parseInt(color.slice(3, 5), 16),
        b = parseInt(color.slice(5), 16);
      if (r > 150 && b > 120 && g < Math.min(r, b) - 60) count++;
    }
  return count;
}

it.each([
  ["2026-04-02T14:00:00Z", false],
  ["2026-04-02T23:00:00Z", false],
  ["2026-04-02T14:00:00Z", true],
  ["2026-04-02T23:00:00Z", true],
] as const)("keeps the boxed flop contained at %s with reduced motion %s", (when, reduced) => {
  current = room({ box: true, boxOut: true, affection: { kind: "flop", at: 1, until: 3600 } }, when, reduced);
  current.run(0, 1200, reduced ? 250 : 16);
  expect(furCells(0, 59), "her ears must still be visible above the box").toBeGreaterThan(0);
  expect(furCells(68, 79), "her body must not escape below the box").toBe(0);
});
