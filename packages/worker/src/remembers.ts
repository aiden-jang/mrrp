import type { Action, Visit } from "./types.js";

export const DAY_MS = 86_400_000;

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

export function roomStartedAt(arrivals: number[], now: number): number {
  const known = arrivals.filter((at) => Number.isFinite(at));
  return known.length > 0 ? Math.min(...known) : now;
}

export interface Milestone {
  kind: "anniversary" | "first-week" | "first-month" | "ours";
  years: number;
  label?: string;
}

export interface OurDay {
  month: number;
  day: number;
  label: string;
}

export function milestoneFor(
  startedAt: number,
  now: number,
  tz: string,
  ours?: OurDay | null,
): Milestone | null {
  const start = localParts(startedAt, tz);
  const today = localParts(now, tz);
  const days = Math.floor((now - startedAt) / DAY_MS);

  if (ours && today.m === ours.month && today.d === ours.day) {
    return { kind: "ours", years: 0, label: ours.label };
  }

  const sameDate = today.m === start.m && today.d === start.d;
  const leapShifted =
    start.m === 2 && start.d === 29 && today.m === 3 && today.d === 1 && !isLeapYear(today.y);
  if ((sameDate || leapShifted) && today.y > start.y) {
    return { kind: "anniversary", years: today.y - start.y };
  }

  if (days === 30) return { kind: "first-month", years: 0 };
  if (days === 7) return { kind: "first-week", years: 0 };
  return null;
}

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export const TRAIT_MINIMUM = 12;

export const TRAIT_SHARE = 0.34;

export const TRAIT_MIN_DAYS = 14;

export type Trait = "petted" | "brushed" | "fed" | "accompanied" | "photographed";

export type Tally = Partial<Record<Action, number>>;

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
  count: number;
}

export function personalityFrom(tally: Tally, daysKnown: number): Personality | null {
  if (!(daysKnown >= TRAIT_MIN_DAYS)) return null;

  const ranked = (Object.entries(tally) as [Action, number][])
    .map(([action, n]): [Trait, number] => [TRAIT_OF[action], n])
    .sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return null;

  const total = ranked.reduce((sum, [, n]) => sum + n, 0);
  if (total < TRAIT_MINIMUM) return null;

  const [trait, count] = ranked[0]!;
  if (count / total < TRAIT_SHARE) return null;
  if (ranked[1] && ranked[1][1] === count) return null;

  return { trait, count };
}

/*
 * When he actually turns up, as against the hour he said he would.
 *
 * He tells the room "usually home around six" once, when he makes it, and then never again. Life
 * moves; the hour he typed does not. So the room watches the first time he looks in each day and
 * quietly learns the real one, and the cat starts waiting at the door then instead.
 */

/** One sample a day, so an evening spent opening the room twenty times counts once. */
export interface Homing {
  /** A running mean of the hour he first looked in, in her timezone. */
  hour: number;
  /** How many days have gone into it. */
  days: number;
  /** The last local day counted, so the same day cannot count twice. */
  lastDay: number;
}

/*
 * A fortnight to believe it, and a fortnight of memory.
 *
 * The mean is capped rather than cumulative so it tracks a change of job or a change of habit instead
 * of being anchored to the first month forever. Under the threshold the room says nothing and keeps
 * using the hour he typed: a cat that starts waiting at the wrong time because of three data points
 * is worse than a cat that waits when she was told to.
 */
export const HOMING_MIN_DAYS = 14;
export const HOMING_MEMORY = 14;

/** Half an hour. Below that it is the same time of day and not worth a sentence. */
export const HOMING_DRIFT = 0.5;

export function homingWith(previous: Homing | null, hour: number, day: number): Homing | null {
  if (previous && previous.lastDay === day) return null;
  if (!previous) return { hour, days: 1, lastDay: day };
  const weight = Math.min(previous.days + 1, HOMING_MEMORY);
  return {
    hour: previous.hour + (hour - previous.hour) / weight,
    days: previous.days + 1,
    lastDay: day,
  };
}

/** The hour she should expect him, or null while the room is still only going on what he typed. */
export function learnedHour(homing: Homing | null, told: number): number | null {
  if (!homing || homing.days < HOMING_MIN_DAYS) return null;
  return Math.abs(homing.hour - told) < HOMING_DRIFT ? null : homing.hour;
}
