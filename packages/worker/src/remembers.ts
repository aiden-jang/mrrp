import type { Action, Visit } from "./types.js";

/*
 * Derived from history, never stored: nothing to migrate and nothing that can disagree with it.
 *
 * Nothing here counts consecutive days or can be broken. A cat petted forty times over two years likes
 * being petted; which days is not the question.
 */

export const DAY_MS = 86_400_000;

/* ------------------------------------------------------------------ anniversaries */

/** Her zone, not the server's: "the day we started" is a calendar fact, and answering it in UTC turns
 *  a room started on the 1st one year old on the evening of the 31st for anybody west of it. */
function localParts(at: number, tz: string): { y: number; m: number; d: number } {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date(at))
    .split("-")
    .map(Number);
  return { y: y!, m: m!, d: d! };
}

/**
 * Earliest arrival rather than a stored key: a seat handover carries `firstSeen` over, so the room keeps
 * its age when a person changes. Falls back to `now`, or an empty room is 1970 and fires every check.
 */
export function roomStartedAt(arrivals: number[], now: number): number {
  const known = arrivals.filter((at) => Number.isFinite(at));
  return known.length > 0 ? Math.min(...known) : now;
}

export interface Milestone {
  kind: "anniversary" | "first-week" | "first-month" | "ours";
  /** Whole years, for an anniversary. Zero for the earlier two and for a day of their own. */
  years: number;
  /** What he called the day, for `ours`. Never longer than a few words; the room repeats it. */
  label?: string;
}

/** A date the two of them care about, month and day only. Years are theirs to remember, not ours. */
export interface OurDay {
  month: number;
  day: number;
  label: string;
}

/**
 * Three moments and no more: a room that celebrates every fortnight is not celebrating.
 *
 * A 29 February room answers on 1 March in common years rather than skipping three years running, an
 * edge that only ever shows up as "why did nothing happen".
 */
export function milestoneFor(
  startedAt: number,
  now: number,
  tz: string,
  ours?: OurDay | null,
): Milestone | null {
  const start = localParts(startedAt, tz);
  const today = localParts(now, tz);
  const days = Math.floor((now - startedAt) / DAY_MS);

  /*
   * A day of theirs beats the room's own, on the rare year the two collide.
   *
   * The room's anniversary is about the room. Theirs is about them, and the room noticing it is the
   * whole point of letting him set one, so it cannot be the thing that gets bumped.
   */
  if (ours && today.m === ours.month && today.d === ours.day) {
    return { kind: "ours", years: 0, label: ours.label };
  }

  const sameDate = today.m === start.m && today.d === start.d;
  // 29 Feb, in a year that has no 29 Feb.
  const leapShifted =
    start.m === 2 && start.d === 29 && today.m === 3 && today.d === 1 && !isLeapYear(today.y);
  if ((sameDate || leapShifted) && today.y > start.y) {
    return { kind: "anniversary", years: today.y - start.y };
  }

  // Exact days rather than a window: mentioning it for a week running would make it wallpaper.
  if (days === 30) return { kind: "first-month", years: 0 };
  if (days === 7) return { kind: "first-week", years: 0 };
  return null;
}

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/* ------------------------------------------------------------------ personality */

/**
 * How much of the history has to point one way before it means anything. Twelve is roughly a month of
 * dropping in, which is where a habit stops being a week of using one button. Below it she has no
 * trait: a cat with a personality on day two is a character sheet, not a cat.
 */
export const TRAIT_MINIMUM = 12;

/** Matters more than the minimum: without it the trait flips whenever the leader changes by one, and a
 *  personality that changes weekly is a readout. */
export const TRAIT_SHARE = 0.34;

/** The count is not a stand-in for time: petting her is a button, and twelve taps in one sitting once
 *  gave a day-old room a personality. */
export const TRAIT_MIN_DAYS = 14;

export type Trait = "petted" | "brushed" | "fed" | "accompanied" | "photographed";

/** A running total, not a read of the visit log: the log keeps forty entries, so a trait derived from
 *  it would quietly drift with nothing in the code admitting to it. */
export type Tally = Partial<Record<Action, number>>;

/** Seeds the running total for a room that predates it, from whatever log it still has. */
export function tallyFrom(log: Visit[]): Tally {
  const tally: Tally = {};
  for (const visit of log) tally[visit.action] = (tally[visit.action] ?? 0) + 1;
  return tally;
}

const TRAIT_OF: Record<Action, Trait> = {
  pet: "petted",
  brush: "brushed",
  bring: "fed",
  sit: "accompanied",
  photo: "photographed",
};

export interface Personality {
  trait: Trait;
  /** How many of the logged visits point this way, for the copy to be honest about. */
  count: number;
}

/**
 * Counted over everything, never a recent window: forgetting is the one thing this is not for.
 *
 * Two gates. Without the count a quiet fortnight invents a trait from three visits; without the age an
 * afternoon of tapping invents one from twelve.
 */
export function personalityFrom(tally: Tally, daysKnown: number): Personality | null {
  if (!(daysKnown >= TRAIT_MIN_DAYS)) return null; // `!(x >= n)` so a NaN age is silent rather than a trait

  const ranked = (Object.entries(tally) as [Action, number][])
    .map(([action, n]): [Trait, number] => [TRAIT_OF[action], n])
    .sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return null;

  const total = ranked.reduce((sum, [, n]) => sum + n, 0);
  if (total < TRAIT_MINIMUM) return null;

  const [trait, count] = ranked[0]!;
  if (count / total < TRAIT_SHARE) return null;
  // A tie picks whichever the sort put first and swaps next visit. Nothing is the honest answer.
  if (ranked[1] && ranked[1][1] === count) return null;

  return { trait, count };
}
