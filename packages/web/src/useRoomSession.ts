import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  adoptSeat,
  beenHere,
  fetchRoom,
  forgetRoom,
  GONE,
  GoneError,
  lastCat,
  myName,
  roomDeletion,
} from "./api.js";
import { useLive } from "./live.js";
import { coveredBy } from "./recent.js";
import { awayLine } from "./remembers.js";
import type { Arrival, RoomView } from "./types.js";

export function useRoomSession(id: string) {
  const [view, updateView] = useState<RoomView | null>(null);
  const generation = useRef(0);
  const alive = useRef(false);
  useLayoutEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      generation.current += 1;
    };
  }, [id]);
  const setView: Dispatch<SetStateAction<RoomView | null>> = useCallback((next) => {
    if (!alive.current) return;
    generation.current += 1;
    updateView(next);
  }, []);
  const [err, setErr] = useState<string | null>(null);
  const [gone, updateGone] = useState<{ undoUntil: number | null } | null>(null);
  const setGone: Dispatch<SetStateAction<typeof gone>> = useCallback((next) => {
    if (!alive.current) return;
    generation.current += 1;
    updateGone(next);
  }, []);
  const [asking, setAsking] = useState(() => !beenHere(id));
  const [awayNote, setAwayNote] = useState<string | null>(null);
  const [arrivalCard, setArrivalCard] = useState<Arrival[] | null>(null);
  // Coarse on purpose. Without it "in about 5 hours" still says five three hours later in a room nobody touched.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 300_000);
    return () => clearInterval(t);
  }, []);
  // How far the card has already told them. See recent.ts: a mark rather than a flag, so dismissing the
  // card does not put everything back.
  const covered = useRef(0);
  const showArrivals = useCallback((arrivals: Arrival[]) => {
    if (arrivals.length === 0) return;
    covered.current = coveredBy(arrivals, covered.current);
    setArrivalCard(arrivals);
  }, []);
  const load = useCallback(
    async (n?: string | null) => {
      if (!alive.current) return;
      const request = ++generation.current;
      const current = () => alive.current && request === generation.current;
      try {
        const next = await fetchRoom(id, n ?? myName.get());
        if (!current()) return;
        adoptSeat(next.seat);
        setView(next);
        lastCat.set(id, next.cat);
        // Him only. To her this would be the room reporting her own arrival back to her.
        const back = next.youAreHer ? null : awayLine(next.awayMs, next.cat.name);
        if (back) setAwayNote((prev) => prev ?? back);
        showArrivals(next.arrivals);
        setErr(null);
      } catch (e) {
        if (!current()) return;
        // A deleted room must not enter the reconnect loop.
        if (e instanceof Error && e.message === GONE) {
          forgetRoom(id);
          setGone({ undoUntil: e instanceof GoneError ? e.undoUntil : null });
          return;
        }
        setErr(`${e instanceof Error ? e.message : "Something went wrong."} Trying again in a moment.`);
      }
    },
    [id, showArrivals, setView, setGone],
  );

  const takeView = useCallback(
    (next: RoomView) => {
      if (!alive.current) return;
      setView(next);
      lastCat.set(id, next.cat);
      showArrivals(next.arrivals);
      setErr(null);
    },
    [id, showArrivals, setView],
  );
  const liveGone = useCallback(() => {
    if (!alive.current) return;
    // The socket's gone message carries no seat-specific recovery deadline.
    setView(null);
    void load();
  }, [load, setView]);
  // Only with a seat. The worker refuses a socket to anybody else, and without this a spectator
  // watching the cat would sit in a reconnect loop against a 403 for as long as the tab is open.
  const live = useLive(id, !asking && !gone && view?.seat != null, takeView, liveGone);

  // A dead link must not be answered with an invitation. The door screen renders before anything is
  // read, so it has to ask whether the room is still there first.
  useEffect(() => {
    if (!asking) return;
    let stale = false;
    void roomDeletion(id).then((deleted) => {
      if (deleted && !stale) setGone(deleted);
    });
    return () => {
      stale = true;
    };
  }, [asking, id, setGone]);

  useEffect(() => {
    if (!asking) void load();
  }, [asking, load]);

  useEffect(() => {
    if (asking || view || !err || gone) return;
    const t = setTimeout(() => void load(), 2500);
    return () => clearTimeout(t);
  }, [asking, view, err, gone, load]);

  useEffect(() => {
    if (asking || gone) return;
    const every = live === "open" ? 120_000 : 15_000;
    const tick = setInterval(() => {
      if (!document.hidden) void load();
    }, every);
    const onShow = () => {
      if (!document.hidden) {
        setNow(Date.now());
        void load();
      }
    };
    document.addEventListener("visibilitychange", onShow);
    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [asking, gone, load, live]);

  return {
    view,
    setView,
    err,
    setErr,
    gone,
    setGone,
    asking,
    setAsking,
    awayNote,
    arrivalCard,
    setArrivalCard,
    covered,
    now,
    load,
    live,
  };
}
