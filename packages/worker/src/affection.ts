import {
  HOLD_RENEW_MS,
  CAT_GESTURE_ACTIONS,
  CAT_REACTION_MS,
  isCatReaction,
  NUZZLE_MS,
  PET_REQUEST_MS,
  type Affection,
  type CatGestureAction,
  type CatReaction,
  type CatAct,
} from "./types.js";

// A closed tab may never send release, so contact expires without renewal.
export const HELD_LAPSE_MS = HOLD_RENEW_MS * 3;

export interface Hold {
  who: string;
  at: number;
  startedAt?: number;
}
export interface StoredAffection {
  // Reactions share this slot, but stay separate in public views for older clients.
  kind: Affection["kind"] | CatReaction["kind"];
  at: number;
  until: number;
  by: string;
  holdAt?: number;
}

export function isGestureAction(act: CatAct): act is CatGestureAction {
  return CAT_GESTURE_ACTIONS.some((gesture) => gesture === act);
}

export function clearsOnPet(stored: StoredAffection | undefined) {
  return !!stored && stored.kind !== "nuzzle";
}

export function activeHold(held: Hold | null | undefined, him: string | null, now: number) {
  return !!him && held?.who === him && now - held.at >= 0 && now - held.at < HELD_LAPSE_MS;
}

export function holdRecord(previous: Hold | undefined, who: string, now: number) {
  const renewed = activeHold(previous, who, now);
  return {
    renewed,
    held: { who, at: now, startedAt: renewed ? (previous!.startedAt ?? previous!.at) : now },
  };
}

export function nextGesture(
  act: CatGestureAction,
  held: Hold | undefined,
  him: string | null,
  her: string,
  now: number,
  current?: StoredAffection,
): StoredAffection | null | undefined {
  if (current?.by === her && isCatReaction(current.kind) && current.until > now) return undefined;
  if (isCatReaction(act)) {
    return activeHold(held, him, now)
      ? undefined
      : { kind: act, at: now, until: now + CAT_REACTION_MS, by: her };
  }
  if (act === "cancel-pets") return null;
  if (!him) return undefined;
  const petting = activeHold(held, him, now);
  if ((act === "nuzzle") !== petting) return undefined;
  const kind = act === "nuzzle" ? "nuzzle" : "ask";
  return {
    kind,
    at: now,
    until: now + (kind === "ask" ? PET_REQUEST_MS : NUZZLE_MS),
    by: her,
    ...(kind === "nuzzle" ? { holdAt: held!.startedAt ?? held!.at } : {}),
  };
}

export function affectionFor(
  stored: StoredAffection | undefined,
  held: Hold | null | undefined,
  him: string | null,
  her: string | null,
  now: number,
): Affection | null {
  if (!stored || isCatReaction(stored.kind) || stored.by !== her || stored.until <= now || stored.at > now)
    return null;
  const petting = activeHold(held, him, now);
  if (stored.kind === "nuzzle" ? !petting || stored.holdAt !== (held?.startedAt ?? held?.at) : petting)
    return null;
  return { kind: stored.kind, at: stored.at, remainingMs: stored.until - now };
}

export function reactionFor(
  stored: StoredAffection | undefined,
  her: string | null,
  now: number,
): CatReaction | null {
  if (!stored || !isCatReaction(stored.kind) || stored.by !== her || stored.until <= now || stored.at > now)
    return null;
  return { kind: stored.kind, at: stored.at, remainingMs: stored.until - now };
}
