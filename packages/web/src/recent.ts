import type { Arrival, Visit } from "./types.js";

// How far the arrival card has already told you. The card and the live list read the same log, so
// without this they say the same thing twice.
export function coveredBy(arrivals: Arrival[], mark = 0): number {
  let out = mark;
  for (const a of arrivals) if (a.kind === "action" && a.at > out) out = a.at;
  return out;
}

/* Never key this on whether the card is showing: dismissing it would put every item back. */
export function liveOnly(recent: Visit[], covered: number): Visit[] {
  return recent.filter((visit) => visit.at > covered);
}
