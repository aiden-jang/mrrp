export const MOTH_CYCLE_MS = 100_000;
export const MOTH_VISIT_MS = 18_000;
export const MOTH_SPREAD = 7;

export interface Moth {
  x: number;
  y: number;
  presence: number;
}

export interface Firefly {
  x: number;
  y: number;
  presence: number;
}

export function fireflyAt(t: number): Firefly | null {
  const cycle = ((t % 76_000) + 76_000) % 76_000;
  if (cycle >= 15_000) return null;
  const k = cycle / 15_000;
  return {
    x: 50 + Math.sin(k * Math.PI * 4) * 15,
    y: 37 + Math.cos(k * Math.PI * 3) * 6,
    presence: Math.sin(k * Math.PI),
  };
}

export function mothAt(t: number, beamX: number): Moth | null {
  // Doubled modulo so a negative clock still lands inside the cycle. The whole visit is a function of
  // `t` and nothing else, because "18 seconds out of every 100" cannot be checked by watching for it.
  const cycle = ((t % MOTH_CYCLE_MS) + MOTH_CYCLE_MS) % MOTH_CYCLE_MS;
  if (cycle >= MOTH_VISIT_MS) return null;

  const k = cycle / MOTH_VISIT_MS;
  return {
    x: beamX + Math.sin(k * Math.PI * 6) * MOTH_SPREAD,
    y: 20 + Math.sin(k * Math.PI * 3.4) * 9 + k * 6,
    presence: Math.sin(k * Math.PI),
  };
}
