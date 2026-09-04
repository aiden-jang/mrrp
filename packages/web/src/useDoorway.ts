import { useCallback, useEffect, useRef, useState } from "react";
import { play } from "./sound.js";
import type { RoomView } from "./types.js";

const OPEN_MS = 4200;
const STAY_MS = 180_000;

/*
 * The door swings when somebody crosses it: you arriving for the first time, or them coming in or
 * going out. `watchDoorAt` is only the leaving half, because that is the one the cat gets up to
 * watch; an arrival she answers with a chirp instead.
 */
export function useDoorway(view: RoomView | null) {
  const [openAt, setOpenAt] = useState<number | null>(null);
  const [watchAt, setWatchAt] = useState<number | null>(null);
  const youArrived = useRef(false);
  const wasHere = useRef<boolean | null>(null);
  const shut = useRef(0);

  /* One timer between both crossings. Two would race: the earlier one shuts the door on the later
     one's swing, so arriving a second before they do cuts a second off it. */
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
    // The first view is not a crossing. Without this the door swings on every reload.
    if (prev === null || prev === here) return;
    if (here) play("chirp");
    else setWatchAt(Date.now());
    swing();
  }, [view?.themHereNow, swing]);

  return { openAt, watchAt };
}

/*
 * Whether you have gone quiet with the room still open and in front of you, which is when the cat
 * settles rather than keeps performing.
 *
 * Losing focus or hiding the tab stops the countdown instead of continuing it. Settling is something
 * she does while you are watching; nobody is there to see it on a tab in the background, and it
 * would already be over by the time you came back.
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
