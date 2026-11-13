import { describe, expect, it } from "vitest";
import { fitRoom, project, propBounds } from "./roomGeometry.js";

describe("the finer room grid", () => {
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
