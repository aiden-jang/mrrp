import type { Action, Visit } from "./types.js";

/*
 * What the room works out from having been used for a while.
 *
 * Two things, both derived rather than stored: how long the two of you have had her, and what she has
 * come to expect from you. Neither needs a new table, because the room already keeps the day it started
 * and a log of what has been done in it. Deriving means there is nothing to migrate and nothing that can
 * disagree with the history it came from.
 *
 * The rule both obey, the same one the rest of this app obeys: nothing here counts consecutive days,
 * nothing can be broken, and nothing tells you what you missed. A cat who has been petted forty times
 * over two years likes being petted. It does not matter which days.
 */

export const DAY_MS = 86_400_000;

/* ------------------------------------------------------------------ anniversaries */

/**
 * A calendar date in a specific zone.
 *
 * Anniversaries have to be answered in her timezone rather than the server's, or a room started on the
 * 1st turns one on the evening of the 31st for anybody west of UTC. Same reasoning as owewell's recurring
 * bills: "the day we started" is a calendar fact, not an instant.
 */
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
 * When the room started: the first time either of them opened the door.
 *
 * The earliest arrival rather than a stored key, because a seat handover deliberately carries `firstSeen`
 * over, so the room keeps its own age even when one of the two people changes. Falls back to `now`, which
 * makes an empty room zero days old and therefore quiet, rather than making it 1970 and having every
 * anniversary check fire at once.
 */
export function roomStartedAt(arrivals: number[], now: number): number {
  const known = arrivals.filter((at) => Number.isFinite(at));
  return known.length > 0 ? Math.min(...known) : now;
}

export interface Milestone {
  kind: "anniversary" | "first-week" | "first-month";
  /** Whole years, for an anniversary. Zero for the earlier two. */
  years: number;
}

/**
 * Whether today is worth mentioning.
 *
 * Three moments and no more. A room that celebrates something every fortnight is not celebrating, and the
 * first week matters because that is when somebody is deciding whether this is a thing they keep.
 *
 * A 29 February room is deliberately answered on 1 March in common years rather than skipped for three
 * years running, which is the kind of edge that only shows up as "why did nothing happen".
 */
export function milestoneFor(startedAt: number, now: number, tz: string): Milestone | null {
  const start = localParts(startedAt, tz);
  const today = localParts(now, tz);
  const days = Math.floor((now - startedAt) / DAY_MS);

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
 * How much of the history has to point one way before it means anything.
 *
 * Twelve is roughly a month of somebody dropping in, which is the point at which a habit is a habit rather
 * than a week where they happened to use one button. Below it she has no trait at all, which is correct: a
 * cat with a personality on day two is a character sheet, not a cat.
 */
export const TRAIT_MINIMUM = 12;

/**
 * And how dominant. A third of everything is a real preference; a plurality of four actions is noise.
 *
 * The threshold matters more than the minimum. Without it the trait flips whenever the leader changes by
 * one, and a personality that changes weekly is not a personality, it is a readout.
 */
export const TRAIT_SHARE = 0.34;

/**
 * And how long the room has to have existed, regardless of the count.
 *
 * The count alone is not a stand-in for time. Twelve pets is meant to represent a month of somebody
 * dropping in, but petting her is a button, and he can press it twelve times in one sitting on the day the
 * room is made. That produced a room that announced a personality on day one, which is the character sheet
 * this was written to avoid. A fortnight is the floor: whatever he does in the first two weeks, she does
 * not yet have habits about him.
 */
export const TRAIT_MIN_DAYS = 14;

export type Trait = "petted" | "brushed" | "fed" | "accompanied" | "photographed";

/**
 * How many times each thing has ever been done in this room.
 *
 * A running total rather than a read of the visit log, because the log is trimmed to the last forty
 * entries. At a few visits a week that is a two-month window, so a trait derived from it would quietly
 * drift: the thing she came to expect in spring would be gone by autumn with nothing in the code saying
 * so. Five integers that only ever go up cost one small key and cannot forget.
 */
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
 * What she has come to expect.
 *
 * Counted over everything that has ever happened here, never a recent window. A window would make her
 * forget, and the one thing this is for is being the part of the room that does not.
 *
 * Two gates, because either alone is wrong. Without the count a quiet fortnight invents a trait from three
 * visits; without the age an afternoon of tapping invents one from twelve.
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
  /*
   * A tie is no trait.
   *
   * Two actions level on top means the room would pick whichever the sort happened to put first, and it
   * would swap on the next visit. Saying nothing is the honest answer to "she likes both equally".
   */
  if (ranked[1] && ranked[1][1] === count) return null;

  return { trait, count };
}
