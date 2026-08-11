/**
 * What the two of you have noticed in here.
 *
 * The room is full of things that only happen if you go looking: a piano in the floorboards, stars
 * in the window, a mouse, a moth, the cat answering to her own name typed at the keyboard. All of it
 * was invisible to the other person. She could spend a week finding every one and he would never
 * know, which for an app whose entire premise is "one cat, exactly two people" is the wrong shape.
 *
 * So the room remembers, per seat, and tells each of you what the other found while you were out.
 *
 * Two rules keep it from turning into a checklist, which would kill the thing it is celebrating:
 *
 *   1. Nothing ever lists what you have not found. The only aggregate is a count, and the count
 *      never says what it is out of, because "7 of 15" is a to-do list with a nicer font.
 *   2. A discovery the other person made is named only if you have found it too. Otherwise all you
 *      hear is that there is something in here you have not seen yet, which is the fun part.
 */

/**
 * Every secret the room knows about, as the client may report it.
 *
 * Allowlisted here rather than trusted from the request. Without it, anybody holding the link could
 * post arbitrary keys and inflate the count into nonsense, or wedge junk into storage that the UI
 * then has to render. The client is not the authority on what exists in the room.
 */
export const DISCOVERY_KEYS = [
  'constellation',
  'roomTour',
  'piano',
  'bubbles',
  'aurora',
  'mrrp',
  'summon',
  'herName',
  'box',
  'yarn',
  'treat',
  'catnip',
  'music',
  'mouse',
] as const;

export type DiscoveryKey = (typeof DISCOVERY_KEYS)[number];

/** Key -> which seat found it -> when. Per seat, so "we both know this one" is answerable. */
export type FoundLedger = Record<string, Record<string, number>>;

export function isDiscoveryKey(value: unknown): value is DiscoveryKey {
  return typeof value === 'string' && (DISCOVERY_KEYS as readonly string[]).includes(value);
}

/**
 * Record that `who` noticed `key`, keeping the first time they did.
 *
 * Returns the ledger and whether this was new for that person. Not overwriting matters: the second
 * visit to the same secret is not a discovery, and letting it re-stamp would resurface it as an
 * arrival on the other side every single time, which turns a small delight into a notification.
 */
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
