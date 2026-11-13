import { describe, expect, it } from "vitest";
import { roomPainter, type RasterView } from "./roomPainter.js";
import type { Sprite } from "./sprites.js";

describe("the fine pixel painter", () => {
  it("aligns window detail to whole fine pixels and clips it to the viewport", () => {
    const calls: number[][] = [];
    const context = { fillStyle: "", fillRect: (...args: number[]) => calls.push(args) };
    const view: RasterView = { scale: 6, camera: 12.5, width: 80, layer: "window" };
    const painter = roomPainter(context as unknown as CanvasRenderingContext2D, view, () => ({
      rows: [],
      step: 0.5,
      ox: 0,
      oy: 0,
    }));
    painter.rect(60 + 1 / 3, 4 + 2 / 3, 2 / 3, 1 / 3, "#123456");
    painter.rect(68, 14, 20, 1, "#123456");
    for (const call of calls) {
      expect(call.every((value) => Number.isInteger(value) && value % 3 === 0)).toBe(true);
      expect(call[0]! + call[2]!).toBeLessThanOrEqual(480);
    }
    expect(calls.length).toBe(2);
  });

  it("keeps the same sprite anchor when a pose is mirrored", () => {
    const calls: { x: number; color: string }[] = [];
    const context = {
      fillStyle: "",
      fillRect(x: number) {
        calls.push({ x, color: this.fillStyle });
      },
    };
    const view: RasterView = { scale: 4, camera: 0, width: 80, layer: null };
    const painter = roomPainter(context as unknown as CanvasRenderingContext2D, view, () => ({
      rows: ["ab"],
      step: 0.5,
      ox: -1,
      oy: 0,
    }));
    painter.blit({} as Sprite, 10, 10, { a: "#111111", b: "#222222" }, true);
    expect(calls).toEqual([
      { x: 36, color: "#222222" },
      { x: 38, color: "#111111" },
    ]);
  });
});
