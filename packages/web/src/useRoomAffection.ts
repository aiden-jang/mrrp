import { useEffect, useRef, useState } from "react";
import { doCatAct } from "./api.js";
import { receiveAffection, type AffectionTrack } from "./affection.js";
import type { AffectionAction, RoomView } from "./types.js";

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
  const track = useRef<AffectionTrack>({ seenAt: -Infinity, current: null });
  track.current = receiveAffection(track.current, view?.affection, performance.now());
  const current = track.current.current;
  const [, refresh] = useState(0);
  const [affectionPending, setPending] = useState(false);
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
  const catAffection = async (act: AffectionAction) => {
    if (pending.current) return;
    pending.current = true;
    setPending(true);
    onError(null);
    try {
      await doCatAct(id, act);
      if (alive.current) await load();
    } catch {
      if (alive.current) onError("Couldn’t share that. Try again.");
    } finally {
      pending.current = false;
      if (alive.current) setPending(false);
    }
  };
  return {
    affection: current && current.until > performance.now() ? current : null,
    affectionPending,
    catAffection,
  };
}
