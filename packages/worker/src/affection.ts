import {
  HOLD_RENEW_MS,
  NUZZLE_MS,
  PET_REQUEST_MS,
  type Affection,
  type AffectionAction,
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
  kind: Affection["kind"];
  at: number;
  until: number;
  by: string;
  holdAt?: number;
}

export function isAffectionAction(act: CatAct): act is AffectionAction {
  return act === "ask-pets" || act === "cancel-pets" || act === "nuzzle";
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

export function nextAffection(
  act: AffectionAction,
  held: Hold | undefined,
  him: string | null,
  her: string,
  now: number,
): StoredAffection | null | undefined {
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
  if (!stored || stored.by !== her || stored.until <= now || stored.at > now) return null;
  const petting = activeHold(held, him, now);
  if (stored.kind === "nuzzle" ? !petting || stored.holdAt !== (held?.startedAt ?? held?.at) : petting)
    return null;
  return { kind: stored.kind, at: stored.at, remainingMs: stored.until - now };
}
