import { useCallback, useEffect, useRef, useState } from "react";
import { play } from "./sound.js";
import type { RoomView } from "./types.js";

const OPEN_MS = 4200;
const STAY_MS = 180_000;

/* `watchAt` is the leaving half only. An arrival she answers with a chirp instead of getting up. */
export function useDoorway(view: RoomView | null) {
  const [openAt, setOpenAt] = useState<number | null>(null);
  const [watchAt, setWatchAt] = useState<number | null>(null);
  const youArrived = useRef(false);
  const wasHere = useRef<boolean | null>(null);
  const shut = useRef(0);

  const swing = useCallback(() => {
    setOpenAt(Date.now());
    window.clearTimeout(shut.current);
    shut.current = window.setTimeout(() => setOpenAt(null), OPEN_MS);
  }, []);
  useEffect(() => () => window.clearTimeout(shut.current), []);

  const yourSeat = view?.you ?? null;
  useEffect(() => {
    if (yourSeat === null || youArrived.current) return;
    youArrived.current = true;
    swing();
  }, [yourSeat, swing]);

  useEffect(() => {
    const here = view?.themHereNow ?? false;
    const prev = wasHere.current;
    wasHere.current = here;
    if (prev === null || prev === here) return;
    if (here) play("chirp");
    else setWatchAt(Date.now());
    swing();
  }, [view?.themHereNow, swing]);

  return { openAt, watchAt };
}

/*
 * Whether you have gone quiet with the room in front of you.
 *
 * Hiding the tab stops the countdown rather than continuing it: settling is something she does while
 * you watch, and it would be over by the time you came back.
 */
export function useStaying() {
  const [staying, setStaying] = useState(false);

  useEffect(() => {
    let timer = 0;
    const arm = () => {
      setStaying(false);
      window.clearTimeout(timer);
      if (document.hidden || !document.hasFocus()) return;
      timer = window.setTimeout(() => setStaying(true), STAY_MS);
    };
    const acts = ["pointerdown", "keydown", "touchstart"] as const;
    arm();
    acts.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    document.addEventListener("visibilitychange", arm);
    window.addEventListener("focus", arm);
    window.addEventListener("blur", arm);
    return () => {
      window.clearTimeout(timer);
      acts.forEach((e) => window.removeEventListener(e, arm));
      document.removeEventListener("visibilitychange", arm);
      window.removeEventListener("focus", arm);
      window.removeEventListener("blur", arm);
    };
  }, []);

  return staying;
}
