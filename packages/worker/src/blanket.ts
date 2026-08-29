// Names only. The colours are a rendering decision and live in the web package; if one is added
// there and not here the room rejects it with a 400, which is a visible failure on the first click.
export const BLANKET_KEYS = ["rose", "moss", "honey", "dusk", "cream"] as const;

export type BlanketKey = (typeof BLANKET_KEYS)[number];

export function isBlanketKey(value: unknown): value is BlanketKey {
  return typeof value === "string" && (BLANKET_KEYS as readonly string[]).includes(value);
}
