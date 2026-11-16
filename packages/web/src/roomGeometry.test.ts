import { describe, expect, it } from "vitest";
import { fitRoom, project, propBounds, propPointer, roomPoint } from "./roomGeometry.js";

describe("the finer room grid", () => {
  it.each([80, 100, 160])("round-trips prop targets through a %s-unit viewport", (width) => {
    for (const camera of [0, 12, -20]) {
      const rect = { left: 80, top: 140, width: 960, height: 480 };
      const prop = { x: 48, y: 32, w: 16, h: 12 };
      const pointer = propPointer(prop, rect, camera, width);
      const point = roomPoint(pointer, rect, camera, width);
      expect(point.x).toBeCloseTo(56);
      expect(point.y).toBeCloseTo(38);
    }
  });
  it.each([1, 1.5, 2, 3])("fits the compact room beside its controls at ratio %s", (ratio) => {
    for (const width of [480, 560, 700, 960]) {
      const fit = fitRoom(width, 900, ratio, 210, true)!;
      expect(fit.height / fit.ratio).toBeLessThanOrEqual(width >= 600 ? 480 : 320);
      if (width >= 600) expect(fit.height / fit.ratio).toBeGreaterThan(320);
      expect(fit.height / fit.ratio + 210).toBeLessThanOrEqual(900);
      expect(fit.width / fit.ratio).toBeLessThanOrEqual(width);
      expect(fit.scale % 2).toBe(0);
      expect(fit.viewport).toBeGreaterThanOrEqual(100);
    }
    expect(fitRoom(390, 844, ratio, 210, true)).toEqual(fitRoom(390, 844, ratio, 210));
  });

  it.each([1, 1.5, 2, 3])("leaves the controls room in shorter occupied windows at ratio %s", (ratio) => {
    for (const width of [640, 960]) {
      for (const height of [320, 480, 700]) {
        const fit = fitRoom(width, height, ratio, 210, true)!;
        expect(fit.height / fit.ratio).toBeLessThanOrEqual(320);
        expect(fit.height / fit.ratio + 210).toBeLessThanOrEqual(height);
        expect(fit.width / fit.ratio).toBeLessThanOrEqual(width);
      }
    }
  });

  it.each([1, 1.5, 2, 3])("keeps half-cell details on whole device pixels at ratio %s", (ratio) => {
    for (const width of [224, 272, 390, 480, 640]) {
      const fit = fitRoom(width, 844, ratio, 210)!;
      expect(fit.scale % 2).toBe(0);
      expect(Number.isInteger(fit.width)).toBe(true);
      expect(Number.isInteger(fit.height)).toBe(true);
      expect(fit.width / fit.ratio).toBeLessThanOrEqual(width);
      expect(fit.height / fit.ratio).toBeLessThanOrEqual(634);
      expect(fit.viewport).toBeGreaterThan(60);
    }
  });

  it("uses the enlarged window for its touch area", () => {
    const bounds = propBounds("window", 60, 4, 17, 11);
    expect(bounds).toEqual({ x: 54, y: 4, w: 51, h: 33 });
    expect(project("window", 77, 15)).toMatchObject({ x: bounds.x + bounds.w, y: bounds.y + bounds.h });
  });

  it("includes the cup and cabinet in the shelf's touch area", () => {
    expect(propBounds("shelf", 80, 24, 16, 4)).toEqual({ x: 24, y: 35, w: 18, h: 13 });
    expect(project("shelf", 84, 19)).toMatchObject({ x: 28, y: 35 });
  });

  it("keeps the room inside a short landscape window", () => {
    const fit = fitRoom(600, 320, 1, 210)!;
    expect(fit.scale).toBe(1);
    expect(fit.height / fit.ratio).toBeLessThanOrEqual(110);
  });

  it.each([1, 1.5, 2, 3])(
    "widens the room without stretching pixels or hiding the controls at ratio %s",
    (ratio) => {
      const fit = fitRoom(960, 900, ratio, 210)!;
      expect(fit.viewport).toBeGreaterThan(100);
      expect(fit.scale % 2).toBe(0);
      expect(fit.width / fit.ratio).toBeLessThanOrEqual(960);
      expect(fit.height / fit.ratio).toBeLessThanOrEqual(480);
    },
  );

  it("includes the plant's larger canopy in its touch area", () => {
    expect(propBounds("plant", 87, 35, 10, 13)).toEqual({ x: 84, y: 28, w: 16, h: 20 });
  });
});
