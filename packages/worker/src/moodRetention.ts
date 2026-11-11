import type { Told } from "./types.js";

export interface StoredMood extends Told {
  expiresAt?: number;
}

export function moodDeadline(mood: StoredMood, tz: string): number {
  if (mood.expiresAt !== undefined) return mood.expiresAt;

  const date = new Intl.DateTimeFormat("en-CA", { timeZone: tz, dateStyle: "short" });
  const day = date.format(mood.at);
  let start = mood.at;
  let end = start + 48 * 60 * 60_000;
  // Find the date boundary without assuming that a day with a clock change lasts 24 hours.
  while (end - start > 1) {
    const middle = Math.floor((start + end) / 2);
    if (date.format(middle) === day) start = middle;
    else end = middle;
  }
  return end;
}

export async function sweepMoods<T extends { mood?: StoredMood }>(
  storage: DurableObjectTransaction,
  kept: T | undefined,
  tz: string,
  now: number,
): Promise<number[]> {
  const moods = (await storage.get<Record<string, StoredMood>>("moods")) ?? {};
  const due: number[] = [];
  let changed = false;
  for (const [seat, mood] of Object.entries(moods)) {
    const expiresAt = moodDeadline(mood, tz);
    if (expiresAt <= now) {
      delete moods[seat];
      changed = true;
    } else {
      due.push(expiresAt);
      if (mood.expiresAt === undefined) {
        moods[seat] = { ...mood, expiresAt };
        changed = true;
      }
    }
  }
  if (changed) {
    if (Object.keys(moods).length) await storage.put("moods", moods);
    else await storage.delete("moods");
  }
  if (kept?.mood) {
    const expiresAt = moodDeadline(kept.mood, tz);
    if (expiresAt <= now) {
      delete kept.mood;
      await storage.put("leftSide", kept);
    } else {
      due.push(expiresAt);
      if (kept.mood.expiresAt === undefined) {
        kept.mood.expiresAt = expiresAt;
        await storage.put("leftSide", kept);
      }
    }
  }
  return due;
}
