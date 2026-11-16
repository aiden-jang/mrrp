export const WINDOW_WIDTH = 64;
export const WINDOW_HEIGHT = 40;
export const WINDOW_STROKES_MAX = 128;
export const WINDOW_POINTS_MAX = 256;
export const WINDOW_TOTAL_POINTS_MAX = 8192;
export const WINDOW_BATCH_MAX = 16;
export const WINDOW_INKS = ["ink", "rose", "leaf"] as const;
export type WindowPoint = [number, number];
export interface WindowStroke {
  id: string;
  ink: (typeof WINDOW_INKS)[number];
  points: WindowPoint[];
}

export interface WindowDrawing {
  revision: number;
  strokes: WindowStroke[];
}

export function isWindowStroke(value: unknown): value is WindowStroke {
  if (!value || typeof value !== "object") return false;
  const stroke = value as Partial<WindowStroke>;
  return (
    typeof stroke.id === "string" &&
    /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/.test(stroke.id) &&
    WINDOW_INKS.some((ink) => ink === stroke.ink) &&
    Array.isArray(stroke.points) &&
    stroke.points.length > 0 &&
    stroke.points.length <= WINDOW_POINTS_MAX &&
    stroke.points.every(
      (point) =>
        Array.isArray(point) &&
        point.length === 2 &&
        Number.isInteger(point[0]) &&
        Number.isInteger(point[1]) &&
        point[0] >= 0 &&
        point[0] < WINDOW_WIDTH &&
        point[1] >= 0 &&
        point[1] < WINDOW_HEIGHT,
    )
  );
}

export function isWindowBatch(value: unknown): value is WindowStroke[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= WINDOW_BATCH_MAX &&
    value.every(isWindowStroke) &&
    new Set(value.map((stroke) => stroke.id)).size === value.length
  );
}
