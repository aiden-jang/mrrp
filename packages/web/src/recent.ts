import type { Arrival, Visit } from "./types.js";

/*
 * Which of their doings the arrival card has already shown you.
 *
 * The card and the live list read the same log, so on the first open after being away they say the
 * same things twice: the card because you missed them, the list because they are recent. They are
 * answering different questions and only one of them should answer each doing.
 *
 * The card owns everything up to the moment you opened the room. The list owns everything since. A
 * high-water mark is enough to split them, because both are built from the same log in the same
 * order. Only `action` arrivals count: a mood or a line she left is not in `theirRecent`, so letting
 * one of those move the mark would hide a real action that happened just before it.
 */
export function coveredBy(arrivals: Arrival[], mark = 0): number {
  let out = mark;
  for (const a of arrivals) if (a.kind === "action" && a.at > out) out = a.at;
  return out;
}

/*
 * Never derive this from whether the card is on screen. Dismissing it would put every item straight
 * back into the list, which is the duplication again with an extra step.
 */
export function liveOnly(recent: Visit[], covered: number): Visit[] {
  return recent.filter((visit) => visit.at > covered);
}
