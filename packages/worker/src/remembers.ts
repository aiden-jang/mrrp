import type { Action, Visit, Milestone, Personality } from "./types.js";
export type { Milestone, Personality } from "./types.js";

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

export interface OurDay {
  month: number;
  day: number;
  label: string;
}

export function milestoneFor(
  startedAt: number,
  now: number,
  tz: string,
  // One each. Neither of them is shown the other's, so the day itself is how you find out.
  named: (OurDay | null | undefined)[] = [],
): Milestone | null {
  const start = localParts(startedAt, tz);
  const today = localParts(now, tz);
  const days = Math.floor((now - startedAt) / DAY_MS);

  const today_ = named.find((d) => d && today.m === d.month && today.d === d.day);
  if (today_) return { kind: "ours", years: 0, label: today_.label };

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

export type Trait = Personality["trait"];

// "leaveout" is counted but is not an Action: he does it from his own panel. It is what "fed" is made of.
export type TallyKey = Action | "leaveout";

export type Tally = Partial<Record<TallyKey, number>>;

const HIS_ACTIONS: TallyKey[] = ["pet", "brush", "sit", "photo", "leaveout"];

// Only his doings. The log carries both seats, and her personality comes out of this tally, so
// counting her own would have her learning traits from herself.
export function tallyFrom(log: Visit[]): Tally {
  const tally: Tally = {};
  for (const visit of log) {
    const action = visit.action as TallyKey;
    if (!HIS_ACTIONS.includes(action)) continue;
    tally[action] = (tally[action] ?? 0) + 1;
  }
  return tally;
}

const TRAIT_OF: Record<TallyKey, Trait> = {
  pet: "petted",
  brush: "brushed",
  sit: "accompanied",
  photo: "photographed",
  leaveout: "fed",
};

export function personalityFrom(tally: Tally, daysKnown: number): Personality | null {
  if (!(daysKnown >= TRAIT_MIN_DAYS)) return null;

  const ranked = (Object.entries(tally) as [TallyKey, number][])
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

/* One sample a day, so an evening spent opening the room twenty times counts once. */
export interface Homing {
  hour: number;
  days: number;
  lastDay: number;
}

// Cap the mean rather than letting it accumulate, or a new job never moves it off the first month.
export const HOMING_MIN_DAYS = 14;
export const HOMING_MEMORY = 14;

/* Half an hour. Below that it is the same time of day and not worth a sentence. */
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

export function learnedHour(homing: Homing | null, told: number): number | null {
  if (!homing || homing.days < HOMING_MIN_DAYS) return null;
  return Math.abs(homing.hour - told) < HOMING_DRIFT ? null : homing.hour;
}
