export const PIANO_CODE = "piano";
export const PIANO_MS = 14_000;
export const PAW_MELODY = [0, 1, 2, 3, 4] as const;

export interface PianoKey {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function pianoKeys(center: number): PianoKey[] {
  const width = 9;
  const gap = 1;
  const total = width * 5 + gap * 4;
  const start = Math.max(5, Math.min(95 - total, center - total / 2));
  return Array.from({ length: 5 }, (_, index) => ({
    index,
    x: start + index * (width + gap),
    y: 58,
    width,
    height: 14,
  }));
}

export function pianoKeyAt(keys: PianoKey[], x: number, y: number): number | null {
  const key = keys.find(
    (item) => x >= item.x && x < item.x + item.width && y >= item.y && y < item.y + item.height,
  );
  return key?.index ?? null;
}

export function advancePawMelody(history: number[], next: number): { history: number[]; complete: boolean } {
  const candidate = [...history, next].slice(-PAW_MELODY.length);
  const complete =
    candidate.length === PAW_MELODY.length && candidate.every((note, index) => note === PAW_MELODY[index]);
  if (complete) return { history: [], complete: true };

  for (let length = Math.min(candidate.length, PAW_MELODY.length - 1); length > 0; length--) {
    const suffix = candidate.slice(-length);
    if (suffix.every((note, index) => note === PAW_MELODY[index]))
      return { history: suffix, complete: false };
  }
  return { history: [], complete: false };
}
