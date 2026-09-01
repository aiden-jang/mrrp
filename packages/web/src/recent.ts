import type { Arrival, Visit } from "./types.js";

/*
 * How far the arrival card has already told you.
 *
 * The card and the live list read the same log, so without this they say the same things twice. The
 * card owns everything up to the moment you opened the room; the list owns everything since.
 *
 * Only `action` arrivals move the mark. A mood or a line is not in `theirRecent`, so letting one
 * move it would hide a real action from just before.
 */
export function coveredBy(arrivals: Arrival[], mark = 0): number {
  let out = mark;
  for (const a of arrivals) if (a.kind === "action" && a.at > out) out = a.at;
  return out;
}

/* Never key this on whether the card is showing: dismissing it would put every item back. */
export function liveOnly(recent: Visit[], covered: number): Visit[] {
  return recent.filter((visit) => visit.at > covered);
}
