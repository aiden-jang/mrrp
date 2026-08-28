/*
 * Which blankets exist, for the half of the job the room does: refusing anything else.
 *
 * The colours live in the web package, because they are a rendering decision and the room has no
 * opinion about them. Only the names are here. If a colour is added there and not here the room
 * rejects it with a 400, which is a visible failure on the first click rather than a silent one.
 */
export const BLANKET_KEYS = ["rose", "moss", "honey", "dusk", "cream"] as const;

export type BlanketKey = (typeof BLANKET_KEYS)[number];

export function isBlanketKey(value: unknown): value is BlanketKey {
  return typeof value === "string" && (BLANKET_KEYS as readonly string[]).includes(value);
}
