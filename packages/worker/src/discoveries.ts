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
  "belly",
  "reached",
] as const;

export type DiscoveryKey = (typeof DISCOVERY_KEYS)[number];

export type FoundLedger = Record<string, Record<string, number>>;

export function isDiscoveryKey(value: unknown): value is DiscoveryKey {
  return typeof value === "string" && (DISCOVERY_KEYS as readonly string[]).includes(value);
}

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

export function foundCount(ledger: FoundLedger): number {
  return Object.keys(ledger).filter((key) => Object.keys(ledger[key] ?? {}).length > 0).length;
}

export interface FoundArrival {
  key: DiscoveryKey;
  at: number;
  mutual: boolean;
}

export function bothFound(ledger: FoundLedger, key: DiscoveryKey, a: string, b: string): boolean {
  const seats = ledger[key] ?? {};
  return seats[a] !== undefined && seats[b] !== undefined;
}

export function arrivalsFor(
  ledger: FoundLedger,
  viewer: string,
  other: string,
  since: number,
  limit = 3,
): FoundArrival[] {
  const out: FoundArrival[] = [];
  for (const key of Object.keys(ledger)) {
    if (!isDiscoveryKey(key)) continue;
    const seats = ledger[key] ?? {};
    const theirs = seats[other];
    if (theirs === undefined || theirs <= since) continue;
    out.push({ key, at: theirs, mutual: seats[viewer] !== undefined });
  }
  return out.sort((a, b) => b.at - a.at).slice(0, limit);
}
