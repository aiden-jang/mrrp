import type { Affection } from "./types.js";

export interface AffectionPlayback {
  kind: Affection["kind"];
  at: number;
  until: number;
}

export interface AffectionTrack {
  seenAt: number;
  current: AffectionPlayback | null;
}

export function receiveAffection(
  track: AffectionTrack,
  next: Affection | null | undefined,
  now: number,
): AffectionTrack {
  if (!next) return track.current ? { ...track, current: null } : track;
  if (next.at < track.seenAt || (next.at === track.seenAt && !track.current)) return track;
  const until = now + next.remainingMs;
  if (next.at === track.seenAt && track.current && until >= track.current.until) return track;
  return { seenAt: next.at, current: { kind: next.kind, at: next.at, until } };
}
