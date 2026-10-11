import { describe, expect, it } from "vitest";
import { sceneFor } from "./hours.js";
import { companionCushion, facialMoment } from "./roomPolish.js";

describe("quiet facial reactions", () => {
  it("holds a tired blink longer without leaving the eyes closed", () => {
    expect(facialMoment(3650, "tired").blink).toBe(true);
    expect(facialMoment(3650, "good").blink).toBe(false);
    expect(facialMoment(3900, "tired").blink).toBe(false);
    expect(facialMoment(8850, "done").blink).toBe(true);
  });

  it("gives flirty a brief wink, with no blink overlapping it", () => {
    for (const time of [2700, 13700]) {
      expect(facialMoment(time, "horny")).toEqual({ blink: false, wink: true });
      expect(facialMoment(time, "good").wink).toBe(false);
    }
    expect(facialMoment(3100, "horny").wink).toBe(false);
  });
});

describe("a place beside the cat", () => {
  it("compresses the cushion when occupied and keeps every pixel on the floor", () => {
    const scene = sceneFor({ tz: "UTC", homeHour: 18 }, Date.parse("2026-04-02T09:00:00Z"));
    const commands = (depth: number) => {
      const out: [number, number, number, number, string][] = [];
      companionCushion((...args) => out.push(args), scene, true, depth);
      return out;
    };
    const empty = commands(0);
    const occupied = commands(1);
    expect(Math.min(...occupied.map((p) => p[1]))).toBeGreaterThan(Math.min(...empty.map((p) => p[1])));
    for (const p of [...empty, ...occupied]) {
      expect(p.slice(0, 4).every(Number.isInteger)).toBe(true);
      expect(p[1]).toBeGreaterThan(48);
      expect(p[1] + p[3]).toBeLessThanOrEqual(80);
      expect(p[2]).toBeGreaterThan(0);
      expect(p[3]).toBeGreaterThan(0);
    }
  });
});
