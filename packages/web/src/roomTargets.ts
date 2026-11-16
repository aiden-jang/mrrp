import { WINDOW, FRAME, SHELF, DOOR, PLANT, BED, BOX_BACK } from "./sprites.js";
import { propBounds } from "./roomGeometry.js";

export const PROP_LABELS: Record<string, string> = {
  window: "the window",
  frame: "the picture on the wall",
  shelf: "the shelf",
  door: "the door",
  plant: "the plant",
  // Both seats read this list, and one of them is the cat, so it cannot be "her bed".
  bed: "the bed",
  box: "the box",
};

export const PROPS = [
  { key: "window", sp: WINDOW, x: 60, y: 4 },
  { key: "frame", sp: FRAME, x: 16, y: 12 },
  { key: "shelf", sp: SHELF, x: 80, y: 24 },
  { key: "door", sp: DOOR, x: 6, y: 32 },
  { key: "plant", sp: PLANT, x: 87, y: 35 },
  { key: "bed", sp: BED, x: 13, y: 70 },
  { key: "box", sp: BOX_BACK, x: 44, y: 57 },
] as const;

export function roomTargetAt(x: number, y: number, boxHere = false, intended?: string | null) {
  return PROPS.map((p) => ({ ...p, ...propBounds(p.key, p.x, p.y, p.sp.w, p.sp.h) }))
    .reverse()
    .find(
      (p) =>
        (p.key !== "box" || boxHere) &&
        (intended ? p.key === intended : x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h),
    );
}
