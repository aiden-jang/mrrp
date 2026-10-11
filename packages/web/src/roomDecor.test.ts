import { describe, expect, it } from "vitest";
import { sceneFor } from "./hours.js";
import { DEFAULT_DECOR, decorateScene, ROOM_ART, ROOM_PALETTES } from "./roomDecor.js";
import { FRAME_HOLE } from "./sprites.js";
import { contrast } from "./legible.js";

describe("room choices", () => {
  const day = sceneFor({ tz: "UTC", homeHour: 18 }, Date.parse("2026-04-02T12:00:00Z"));
  const night = sceneFor({ tz: "UTC", homeHour: 18 }, Date.parse("2026-04-02T02:00:00Z"));
  it("preserves the original room for older accounts", () => {
    expect(decorateScene(day, DEFAULT_DECOR)).toBe(day);
  });
  it("keeps night dimmer and leaves cat behavior alone in every palette", () => {
    for (const palette of Object.keys(ROOM_PALETTES) as (keyof typeof ROOM_PALETTES)[]) {
      const d = decorateScene(day, { ...DEFAULT_DECOR, palette });
      const n = decorateScene(night, { ...DEFAULT_DECOR, palette });
      expect(contrast(n.wallTop, "#ffffff")).toBeGreaterThan(contrast(d.wallTop, "#ffffff"));
      expect(d.catX).toBe(day.catX);
      expect(n.pose).toBe(night.pose);
    }
  });
  it("changes only the print inside the frame", () => {
    for (const art of [ROOM_ART.moon, ROOM_ART.flower]) {
      expect(art.rows.every((row) => row.length === art.w)).toBe(true);
      for (let y = 0; y < art.h; y++)
        for (let x = 0; x < art.w; x++) {
          const inPrint =
            x >= FRAME_HOLE.x &&
            x < FRAME_HOLE.x + FRAME_HOLE.w &&
            y >= FRAME_HOLE.y &&
            y < FRAME_HOLE.y + FRAME_HOLE.h;
          if (!inPrint) expect(art.rows[y]![x]).toBe(ROOM_ART.fish.rows[y]![x]);
        }
      expect(art.rows).not.toEqual(ROOM_ART.fish.rows);
    }
  });
});
