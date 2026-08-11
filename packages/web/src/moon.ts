const SYNODIC_MONTH_DAYS = 29.530588853;
const DAY_MS = 86_400_000;
// A well-known new moon anchor; phase repeats from here independent of the viewer's timezone.
const NEW_MOON_2000 = Date.UTC(2000, 0, 6, 18, 14);

export const MOON_PHASES = [
  "new moon",
  "waxing crescent",
  "first quarter",
  "waxing gibbous",
  "full moon",
  "waning gibbous",
  "last quarter",
  "waning crescent",
] as const;

export interface MoonPhase {
  index: number;
  name: (typeof MOON_PHASES)[number];
}

export function moonPhase(date: Date): MoonPhase {
  const cycles = (date.getTime() - NEW_MOON_2000) / DAY_MS / SYNODIC_MONTH_DAYS;
  const fraction = ((cycles % 1) + 1) % 1;
  const index = Math.round(fraction * 8) % 8;
  return { index, name: MOON_PHASES[index]! };
}

/** Whether one pixel in the five-column moon face is lit for this eighth of the lunar cycle. */
export function moonPixelLit(phase: number, x: number): boolean {
  if (phase === 0) return false;
  if (phase === 1) return x >= 4;
  if (phase === 2) return x >= 2;
  if (phase === 3) return x >= 1;
  if (phase === 4) return true;
  if (phase === 5) return x <= 3;
  if (phase === 6) return x <= 2;
  return x === 0;
}
