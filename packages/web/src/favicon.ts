import { iconMark } from "./iconMark.js";
import type { Cat } from "./types.js";

export function faviconFor(cat: Omit<Cat, "name">): string {
  return `data:image/svg+xml,${encodeURIComponent(iconMark(cat.fur))}`;
}
