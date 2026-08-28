/*
 * The blanket on her bed, which is the one thing in the room she chooses.
 *
 * He makes the room: the cat, the hours, the notes, the day it remembers. She taps a mood and leaves
 * a line. That asymmetry is right for a gift, but it left the person the gift is for with nothing of
 * her own in the room, and a room you cannot put anything into is somebody else's room.
 *
 * Deliberately one small object rather than a second editor. She is the cat, so the thing she gets to
 * decide is where the cat sleeps and what it sleeps under.
 */

export const BLANKETS = {
  rose: { d: "#b07f76", f: "#d8a79c", b: "#c4918a" },
  moss: { d: "#6f7f5e", f: "#9db184", b: "#839472" },
  honey: { d: "#c08a43", f: "#e8c07a", b: "#d3a55d" },
  dusk: { d: "#6d6480", f: "#9a90ad", b: "#837a99" },
  cream: { d: "#c2ad8c", f: "#f0e3c9", b: "#dccdaf" },
} as const;

export type BlanketKey = keyof typeof BLANKETS;

export const BLANKET_KEYS = Object.keys(BLANKETS) as BlanketKey[];

/** What the room came with, so a room nobody has touched still has a made bed. */
export const DEFAULT_BLANKET: BlanketKey = "rose";

export function isBlanketKey(value: unknown): value is BlanketKey {
  return typeof value === "string" && (BLANKET_KEYS as string[]).includes(value);
}

export function blanketPalette(key: BlanketKey | null): Record<string, string> {
  return BLANKETS[key ?? DEFAULT_BLANKET];
}
