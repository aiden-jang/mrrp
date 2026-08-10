/**
 * The moth.
 *
 * A room with something living in it that isn't the subject feels inhabited, and it gives her eyes
 * somewhere to point when your cursor isn't there. A cat staring straight ahead forever is the flattest
 * thing on screen.
 *
 * The timing lives here, as a pure function of `t`, because a visit that happens for 18 seconds out of
 * every 100 is impossible to verify by looking: I spent two attempts screenshotting the wrong 18 seconds
 * before admitting the cadence needed to be testable rather than chased.
 */

/** One visit every this many ms. */
export const MOTH_CYCLE_MS = 100_000;
/** How long a visit lasts. */
export const MOTH_VISIT_MS = 18_000;
/** Horizontal drift either side of the beam centre, in logical pixels. */
export const MOTH_SPREAD = 7;

export interface Moth {
  x: number;
  y: number;
  /** 0 at the edges of the visit, 1 in the middle. Fades it in and out instead of popping. */
  presence: number;
}

export interface Firefly {
  x: number;
  y: number;
  presence: number;
}

/** A slower, wider night visitor for the window garden. */
export function fireflyAt(t: number): Firefly | null {
  const cycle = ((t % 76_000) + 76_000) % 76_000;
  if (cycle >= 15_000) return null;
  const k = cycle / 15_000;
  return { x: 50 + Math.sin(k * Math.PI * 4) * 15, y: 37 + Math.cos(k * Math.PI * 3) * 6, presence: Math.sin(k * Math.PI) };
}

/**
 * Where the moth is at time `t`, or null when it isn't visiting.
 *
 * @param t      animation clock in ms (the requestAnimationFrame timestamp)
 * @param beamX  centre of the sunbeam it drifts around, in logical pixels
 */
export function mothAt(t: number, beamX: number): Moth | null {
  const cycle = ((t % MOTH_CYCLE_MS) + MOTH_CYCLE_MS) % MOTH_CYCLE_MS; // tolerate negative t
  if (cycle >= MOTH_VISIT_MS) return null;

  const k = cycle / MOTH_VISIT_MS;
  return {
    // Slow figure-eight, kept within MOTH_SPREAD of the beam so it never drifts out of the light.
    x: beamX + Math.sin(k * Math.PI * 6) * MOTH_SPREAD,
    y: 20 + Math.sin(k * Math.PI * 3.4) * 9 + k * 6,
    presence: Math.sin(k * Math.PI),
  };
}
