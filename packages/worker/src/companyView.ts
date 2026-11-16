import { affectionFor, reactionFor, HELD_LAPSE_MS, type Hold, type StoredAffection } from "./affection.js";
const WAITING_LAPSE_MS = 90 * 60_000;
export const SITTING_LAPSE_MS = 10 * 60_000;
export type StoredContact = Hold | StoredAffection;

export function view(
  records: Map<string, StoredContact>,
  me: string,
  him: string | null,
  her: string | null,
  now: number,
) {
  const otherId = me === her ? him : me === him ? her : null;
  const held = records.get("held") as Hold | undefined;
  const gesture = records.get("affection") as StoredAffection | undefined;
  const sitting = records.get("sitting") as Hold | undefined;
  const sittingNow = !!sitting && now - sitting.at < SITTING_LAPSE_MS;
  const settled = sittingNow ? records.get("settled") : null;
  const waiting = records.get("waiting") as Hold | undefined;
  return {
    affection: affectionFor(gesture, held, him, her, now),
    reaction: reactionFor(gesture, her, now),
    heldByThem: !!held && held.who === otherId && now - held.at < HELD_LAPSE_MS,
    sittingWith: sittingNow && sitting.who === me,
    sittingWithYou: sittingNow && sitting.who === otherId,
    settled: !!settled,
    waitingAtDoor: !!waiting && now - waiting.at < WAITING_LAPSE_MS,
  };
}

export interface Poke {
  who: string;
  what: string;
  at: number;
}

export function sharedPokes(
  poke: Poke | null | undefined,
  reach: { what: string; at: number } | null | undefined,
  otherId: string | null,
  now: number,
) {
  const live = (at: number) => now - at < 4000;
  return {
    // Own taps already moved this room; echoing them would play the same wobble twice.
    pokedByThem: poke && poke.who === otherId && live(poke.at) ? { what: poke.what, at: poke.at } : null,
    reachedTogether: reach && live(reach.at) ? reach : null,
  };
}

export interface WindowLight {
  from: string;
  at: number;
}
