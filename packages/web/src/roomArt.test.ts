import { describe, expect, it } from "vitest";
import { BED, SHELF, WINDOW, MUG, PLANT } from "./sprites.js";
import { roomArt } from "./roomArt.js";
import { project, propBounds, type RoomLayer } from "./roomGeometry.js";

describe("the room art and its interaction geometry", () => {
  it.each([
    { key: "window", sprite: WINDOW, x: 60, y: 4, layer: "window" },
    { key: "shelf", sprite: SHELF, x: 80, y: 24, layer: "shelf" },
    { key: "shelf", sprite: MUG, x: 84, y: 19, layer: "shelf" },
    { key: "plant", sprite: PLANT, x: 87, y: 35, layer: null },
    { key: "bed", sprite: BED, x: 24, y: 70, layer: null },
  ])("keeps painted $key cells inside their activation bounds", ({ key, sprite, x, y, layer }) => {
    const bounds = key === "bed" ? propBounds(key, 13, 70, 20, 8) : propBounds(key, x, y, sprite.w, sprite.h);
    const art = roomArt(sprite);
    expect(art.rows.every((row) => row.length === art.rows[0]!.length)).toBe(true);
    for (let row = 0; row < art.rows.length; row++) {
      for (let col = 0; col < art.rows[row]!.length; col++) {
        if (art.rows[row]![col] === ".") continue;
        const point = project(layer as RoomLayer, x + art.ox + col * art.step, y + art.oy + row * art.step);
        expect(point.x).toBeGreaterThanOrEqual(bounds.x);
        expect(point.y).toBeGreaterThanOrEqual(bounds.y);
        expect(point.x + art.step * point.scale).toBeLessThanOrEqual(bounds.x + bounds.w + 0.0001);
        expect(point.y + art.step * point.scale).toBeLessThanOrEqual(bounds.y + bounds.h + 0.0001);
      }
    }
  });
});
