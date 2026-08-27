export interface BubbleSeed {
  x: number;
  delay: number;
  drift: number;
  phase: number;
}

export interface BubbleMoment {
  x: number;
  y: number;
  presence: number;
}

export const BUBBLE_GAME_MS = 11_000;
const BUBBLE_LAP_MS = 4_800;

export function bubbleSeeds(center: number): BubbleSeed[] {
  const offsets = [-22, -11, 0, 12, 23];
  return offsets.map((offset, index) => ({
    x: Math.max(8, Math.min(92, center + offset)),
    delay: index * 210,
    drift: index % 2 === 0 ? 3 : -3,
    phase: index * 0.83,
  }));
}

export function bubbleMomentAt(seed: BubbleSeed, elapsed: number, reduceMotion = false): BubbleMoment | null {
  const local = elapsed - seed.delay;
  if (local < 0 || elapsed >= BUBBLE_GAME_MS) return null;
  if (reduceMotion) return { x: seed.x, y: 35 + seed.phase * 4, presence: 0.9 };

  const lap = (local % BUBBLE_LAP_MS) / BUBBLE_LAP_MS;
  const x = seed.x + Math.sin(lap * Math.PI * 2 + seed.phase) * seed.drift;
  const y = 67 - lap * 47;
  const presence = Math.min(1, lap / 0.1, (1 - lap) / 0.12);
  return { x, y, presence: Math.max(0, presence) };
}
