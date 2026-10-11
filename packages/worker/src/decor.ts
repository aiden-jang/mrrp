import type { RoomDecor } from "./types.js";

export function isRoomDecor(value: unknown): value is RoomDecor {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const decor = value as Record<string, unknown>;
  return (
    Object.keys(decor).length === 4 &&
    Object.values(decor).every((item) => typeof item === "string") &&
    ["oat", "rose", "moss", "midnight"].includes(String(decor.palette)) &&
    ["plain", "stripe", "check"].includes(String(decor.rug)) &&
    ["fish", "moon", "flower"].includes(String(decor.art)) &&
    ["cloud", "rose", "ink"].includes(String(decor.mug))
  );
}
