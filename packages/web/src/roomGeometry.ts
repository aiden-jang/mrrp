export type RoomLayer = "window" | "shelf" | null;

export function project(layer: RoomLayer, x: number, y: number) {
  if (layer === "window") return { x: 60 + (x - 60) * 1.5, y: 4 + (y - 4) * 1.5, scale: 1.5 };
  if (layer === "shelf") return { x: x - 4, y: y + 16, scale: 1 };
  return { x, y, scale: 1 };
}

export function propBounds(key: string, x: number, y: number, width: number, height: number) {
  if (key === "shelf") return { x: 76, y: 35, w: 18, h: 13 };
  if (key === "plant") return { x: 84, y: 28, w: 16, h: 20 };
  const point = project(key === "window" ? "window" : null, x, y);
  return { x: point.x, y: point.y, w: width * point.scale, h: height * point.scale };
}

export function fitRoom(width: number, height: number, ratio: number, reserve: number) {
  const d = Math.min(3, ratio || 1);
  const cap = height > 0 ? Math.min(height * 0.78, height - reserve) : width;
  const available = Math.min(width > 0 ? width : Infinity, cap);
  if (!Number.isFinite(available) || available < 80) return null;
  // Short windows need the coarse grid to keep the entrance action visible.
  if (cap * d < 160) {
    const viewport = width > 0 ? Math.min(100, Math.floor(width * d)) : 80;
    return { scale: 1, viewport, width: viewport, height: 80, ratio: d };
  }
  const target = Math.round(((width > 0 ? width : cap) * d) / 160) * 2;
  const scale = Math.max(2, Math.min(target, Math.floor((cap * d) / 160) * 2));
  const viewport = width > 0 ? Math.min(100, Math.floor((width * d) / (scale / 2)) / 2) : 80;
  return { scale, viewport, width: viewport * scale, height: 80 * scale, ratio: d };
}
