const SYNODIC_MONTH_DAYS = 29.530588853;
const DAY_MS = 86_400_000;
// A well-known new moon anchor; phase repeats from here independent of the viewer's timezone.
const NEW_MOON_2000 = Date.UTC(2000, 0, 6, 18, 14);

const MOON_PHASES = [
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

/**
 * One line, on the nights the window is worth looking up at.
 *
 * Only the full moon. The room has always drawn the true phase and nobody could read it, but naming
 * all eight would turn a room detail into a readout, and "waning crescent" is not news. Null the rest
 * of the month, which is what makes the three or four nights it does appear mean anything.
 */
export function moonLine(date: Date, catName: string): string | null {
  if (moonPhase(date).index !== 4) return null;
  return `the moon is full tonight, and it is right in ${catName}'s window.`;
}
