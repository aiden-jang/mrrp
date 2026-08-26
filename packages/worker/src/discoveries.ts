/**
 * What the two of you have noticed, remembered per seat.
 *
 * Two rules keep it from becoming a checklist:
 *   1. Never list what you have not found. The only aggregate is a count, never "7 of 15".
 *   2. Name the other person's find only if you found it too; otherwise just say there is something.
 */

/** Allowlisted, not trusted from the request: anybody with the link could otherwise post junk keys. */
export const DISCOVERY_KEYS = [
  "constellation",
  "roomTour",
  "piano",
  "bubbles",
  "aurora",
  "mrrp",
  "summon",
  "herName",
  "box",
  "yarn",
  "treat",
  "catnip",
  "music",
  "mouse",
] as const;

export type DiscoveryKey = (typeof DISCOVERY_KEYS)[number];

/** Key -> which seat found it -> when. Per seat, so "we both know this one" is answerable. */
export type FoundLedger = Record<string, Record<string, number>>;

export function isDiscoveryKey(value: unknown): value is DiscoveryKey {
  return typeof value === "string" && (DISCOVERY_KEYS as readonly string[]).includes(value);
}

/** Keeps the first time, never re-stamps: a re-stamp resurfaces it as an arrival on the other side
 *  every visit, which turns a small delight into a notification. */
export function recordFound(
  ledger: FoundLedger,
  key: DiscoveryKey,
  who: string,
  at: number,
): { ledger: FoundLedger; isNew: boolean } {
  const seats = ledger[key] ?? {};
  if (seats[who] !== undefined) return { ledger, isNew: false };
  return { ledger: { ...ledger, [key]: { ...seats, [who]: at } }, isNew: true };
}

/** How many distinct things the pair has noticed between them. Never out of how many exist. */
export function foundCount(ledger: FoundLedger): number {
  return Object.keys(ledger).filter((key) => Object.keys(ledger[key] ?? {}).length > 0).length;
}

export interface FoundArrival {
  key: DiscoveryKey;
  at: number;
  /** True when the viewer has found it too, which is the only case it may be named. */
  mutual: boolean;
}

/**
 * Whether both seats have found the same secret.
 *
 * The room behaves slightly differently once both of you have called her by name, which is the only
 * state in here that needs *both* rather than either. Derived from the ledger rather than stored,
 * so it cannot disagree with the finds it came from.
 */
export function bothFound(ledger: FoundLedger, key: DiscoveryKey, a: string, b: string): boolean {
  const seats = ledger[key] ?? {};
  return seats[a] !== undefined && seats[b] !== undefined;
}

/**
 * What the other seat found since `since`, from the viewer's side.
 *
 * Sorted newest first and capped, because this shares an arrival card with everything else the room
 * has to say. Somebody who binges eight secrets in one sitting should not bury the sentence she left.
 */
export function arrivalsFor(
  ledger: FoundLedger,
  viewer: string,
  other: string,
  since: number,
  limit = 3,
): FoundArrival[] {
  const out: FoundArrival[] = [];
  for (const key of Object.keys(ledger)) {
    if (!isDiscoveryKey(key)) continue; // a key retired from the allowlist since it was stored
    const seats = ledger[key] ?? {};
    const theirs = seats[other];
    if (theirs === undefined || theirs <= since) continue;
    out.push({ key, at: theirs, mutual: seats[viewer] !== undefined });
  }
  return out.sort((a, b) => b.at - a.at).slice(0, limit);
}
