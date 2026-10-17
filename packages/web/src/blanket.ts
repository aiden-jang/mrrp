import type { BlanketKey } from "@mrrp/shared";
export { BLANKET_KEYS, type BlanketKey } from "@mrrp/shared";

// The one thing in the room she chooses. Colours from the room's own palette, so her bed never
// arrives in a shade the rest of the place has never heard of.
export const BLANKETS = {
  rose: { d: "#b07f76", f: "#d8a79c", b: "#c4918a" },
  moss: { d: "#6f7f5e", f: "#9db184", b: "#839472" },
  honey: { d: "#c08a43", f: "#e8c07a", b: "#d3a55d" },
  dusk: { d: "#6d6480", f: "#9a90ad", b: "#837a99" },
  cream: { d: "#c2ad8c", f: "#f0e3c9", b: "#dccdaf" },
} as const satisfies Record<BlanketKey, { d: string; f: string; b: string }>;

export const DEFAULT_BLANKET: BlanketKey = "rose";

export function blanketPalette(key: BlanketKey | null): Record<string, string> {
  return BLANKETS[key ?? DEFAULT_BLANKET];
}
