import { useEffect, useRef, useState } from "react";
import { doCatAct } from "./api.js";
import { receiveGesture, type CatGestureTrack } from "./affection.js";
import { isCatReaction, type CatGestureAction, type RoomView } from "./types.js";

export function useRoomAffection({
  id,
  view,
  load,
  onError,
}: {
  id: string;
  view?: RoomView | null;
  load: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const track = useRef<CatGestureTrack>({ seenAt: -Infinity, current: null });
  track.current = receiveGesture(track.current, view?.reaction ?? view?.affection, performance.now());
  const current = track.current.current;
  const [, refresh] = useState(0);
  const [pendingAction, setPending] = useState<CatGestureAction | null>(null);
  const pending = useRef(false);
  const alive = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!current || current.until <= performance.now()) return;
    const timer = setTimeout(() => refresh((n) => n + 1), Math.ceil(current.until - performance.now()));
    return () => clearTimeout(timer);
  }, [current]);
  const catGesture = async (act: CatGestureAction) => {
    if (pending.current) return;
    pending.current = true;
    setPending(act);
    onError(null);
    try {
      await doCatAct(id, act);
      if (alive.current) await load();
    } catch {
      if (alive.current) onError("Couldn’t share that. Try again.");
    } finally {
      pending.current = false;
      if (alive.current) setPending(null);
    }
  };
  const active = current && current.until > performance.now() ? current : null;
  return {
    affection: active && !isCatReaction(active.kind) ? active : null,
    reaction: active && isCatReaction(active.kind) ? active : null,
    affectionPending: pendingAction !== null,
    reactionPending: isCatReaction(pendingAction) ? pendingAction : null,
    catGesture,
  };
}
