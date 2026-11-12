import type { Sprite } from "./sprites.js";
import type { PixelArt } from "./pixelArt.js";
import { project, type RoomLayer } from "./roomGeometry.js";

export interface RasterView {
  scale: number;
  camera: number;
  width: number;
  layer: RoomLayer;
}

export function roomPainter(
  context: CanvasRenderingContext2D,
  view: RasterView,
  artwork: (sprite: Sprite) => PixelArt,
) {
  const rect = (x: number, y: number, width: number, height: number, color: string) => {
    if (!color) return;
    const point = project(view.layer, x, y);
    const density = view.scale === 1 ? 1 : 2;
    const snap = (value: number) => Math.round(value * density) / density;
    const left = Math.max(0, Math.round((snap(point.x) - view.camera) * view.scale));
    const top = Math.max(0, Math.round(snap(point.y) * view.scale));
    const right = Math.min(
      view.width * view.scale,
      Math.round((snap(point.x + width * point.scale) - view.camera) * view.scale),
    );
    const bottom = Math.min(80 * view.scale, Math.round(snap(point.y + height * point.scale) * view.scale));
    if (right <= left || bottom <= top) return;
    context.fillStyle = color;
    context.fillRect(left, top, right - left, bottom - top);
  };
  const px = (x: number, y: number, color: string, size = 1) => rect(x, y, size, size, color);
  const dither = (x: number, y: number, width: number, height: number, color: string, phase = 0) => {
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        if ((col + row + phase) % 2 === 0) px(x + col, y + row, color);
      }
    }
  };
  const blit = (sprite: Sprite, x: number, y: number, palette: Record<string, string>, flip = false) => {
    const art = artwork(sprite);
    for (let row = 0; row < art.rows.length; row++) {
      const cells = art.rows[row]!;
      for (let col = 0; col < cells.length;) {
        const key = cells[flip ? cells.length - 1 - col : col]!;
        let end = col + 1;
        while (end < cells.length && cells[flip ? cells.length - 1 - end : end] === key) end++;
        rect(
          x + art.ox + col * art.step,
          y + art.oy + row * art.step,
          (end - col) * art.step,
          art.step,
          palette[key] ?? "",
        );
        col = end;
      }
    }
  };
  return { px, rect, dither, blit };
}
