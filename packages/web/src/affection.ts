import type { Affection, CatReaction } from "./types.js";

export interface CatGesturePlayback {
  kind: Affection["kind"] | CatReaction["kind"];
  at: number;
  until: number;
}

export interface CatGestureTrack {
  seenAt: number;
  current: CatGesturePlayback | null;
}

export function receiveGesture(
  track: CatGestureTrack,
  next: Affection | CatReaction | null | undefined,
  now: number,
): CatGestureTrack {
  if (!next) return track.current ? { ...track, current: null } : track;
  if (next.at < track.seenAt || (next.at === track.seenAt && !track.current)) return track;
  const until = now + next.remainingMs;
  if (next.at === track.seenAt && track.current && until >= track.current.until) return track;
  return { seenAt: next.at, current: { kind: next.kind, at: next.at, until } };
}
