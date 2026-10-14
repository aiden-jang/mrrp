import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  doAct,
  doBlanket,
  doBoxOut,
  doCatAct,
  doDraw,
  doHold,
  doLeaveGift,
  doLeaveOut,
  doPoke,
  doSettle,
  doSit,
  doTell,
  doTidy,
  doWait,
  doWindowLight,
  fetchRoom,
  roomFromPath,
} from "./api.js";
import type { BlanketKey } from "./blanket.js";
import { buzz, play, type Cue } from "./sound.js";
import type { Action, CatAct, Gift, Mood, RoomView, Treat } from "./types.js";
import { ACTIONS } from "./types.js";

const ACTION_SOUND: Record<Action, Cue> = {
  pet: "purr",
  brush: "brush",
  sit: "settle",
  photo: "shutter",
};

const MUG_AGAIN_MS = 1400;
const STROKES_NEEDED = 5;

/* Must match PET_TAP_MS in Cat.tsx: how long a tap of the pet button reads as a hold. */
const PET_TAP_MS = 1800;

export function useRoomActions({
  id,
  setView,
  onError,
  onDid,
  load,
  setNudge,
  setShelfAt,
}: {
  id: string;
  setView: Dispatch<SetStateAction<RoomView | null>>;
  onError: (message: string | null) => void;
  onDid: (message: string | null) => void;
  load: () => Promise<void>;
  setNudge: Dispatch<SetStateAction<number>>;
  setShelfAt: Dispatch<SetStateAction<number | null>>;
}) {
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(
    () => () => {
      for (const timer of timers.current) clearTimeout(timer);
    },
    [],
  );
  const later = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      callback();
    }, delay);
    timers.current.add(timer);
  }, []);
  const tidy = useCallback(async () => {
    const r = roomFromPath();
    if (!r) return;
    try {
      const { again } = await doTidy(r);
      if (!again) {
        setView(await fetchRoom(r));
        return;
      }
      setView((v) => (v ? { ...v, shelfDown: false } : v));
      later(() => {
        play("thump");
        setMugFell(Date.now());
        void fetchRoom(r).then(setView);
      }, MUG_AGAIN_MS);
    } catch {
      // The mug can fall again tomorrow.
    }
  }, [later, setView]);
  const [bedding, setBedding] = useState(false);
  const pickBlanket = async (key: BlanketKey, stripe: boolean) => {
    setBedding(true);
    setView((v) => (v ? { ...v, blanket: { key, stripe } } : v));
    try {
      setView(await doBlanket(id, key, stripe));
    } catch {
      await load();
      onError("Couldn’t save that blanket. Try again.");
    }
    setBedding(false);
  };

  const windowLightPending = useRef(false);
  const touchWindowLight = useCallback(async () => {
    if (windowLightPending.current) return;
    windowLightPending.current = true;
    try {
      setView(await doWindowLight(id));
    } catch {
      // A missed glint leaves the ordinary window.
    } finally {
      windowLightPending.current = false;
    }
  }, [id, setView]);

  const [mugFell, setMugFell] = useState<number | null>(null);
  const [petAt, setPetAt] = useState<number | null>(null);
  const [drawing, setDrawing] = useState(false);
  const hangUp = async (cells: string) => {
    setDrawing(true);
    try {
      setView(await doDraw(id, cells));
      play("settle");
      return true;
    } catch (e) {
      onError(e instanceof Error ? e.message : "Couldn't hang that up.");
      return false;
    } finally {
      setDrawing(false);
    }
  };

  const [giftWords, setGiftWords] = useState("");
  const [strokes, setStrokes] = useState<number | null>(null);
  // Armed once he has been told the photo takes her drawing down.
  const [photoOver, setPhotoOver] = useState(false);
  // One per prop per second. Somebody drumming on the plant is not a request per tap.
  const lastPoke = useRef<Record<string, number>>({});
  const sharePoke = useCallback(
    (what: string) => {
      const now = Date.now();
      if (now - (lastPoke.current[what] ?? 0) < 1000) return;
      lastPoke.current[what] = now;
      doPoke(id, what);
    },
    [id],
  );

  const stroke = () => {
    setStrokes((n) => {
      if (n === null) return null;
      const next = n + 1;
      if (next < STROKES_NEEDED) {
        play("brush");
        buzz("brush");
        return next;
      }
      void act("brush");
      return null;
    });
  };

  const waitAtDoor = async (on: boolean) => {
    setNudge((v) => v + 1);
    play(on ? "settle" : "chirp");
    try {
      setView(await doWait(id, on));
    } catch (e) {
      onError(e instanceof Error ? e.message : "Couldn't do that.");
    }
  };

  const settleIn = async (on: boolean) => {
    setNudge((v) => v + 1);
    play("purr");
    try {
      setView(await doSettle(id, on));
    } catch (e) {
      onError(e instanceof Error ? e.message : "Couldn't do that.");
    }
  };

  const sitWith = async (on: boolean) => {
    setNudge((v) => v + 1);
    play(on ? "settle" : "thump");
    try {
      setView(await doSit(id, on));
    } catch (e) {
      onError(e instanceof Error ? e.message : "Couldn't do that.");
    }
  };

  const act = async (a: Action) => {
    setNudge((v) => v + 1);
    play(ACTION_SOUND[a]);
    if (a === "pet" || a === "brush") buzz(a);
    // The button is a short hold, because that is what it is. Petting leaves no mark, so the hold is the
    // whole of it, and the two `doHold` calls send it down the path a real hold uses.
    if (a === "pet") {
      setPetAt(Date.now());
      doHold(id, true);
      later(() => doHold(id, false), PET_TAP_MS);
    }
    try {
      setView(await doAct(id, a));
      const said = ACTIONS.find((x) => x.id === a)?.mine;
      if (said) {
        onDid(said);
        later(() => onDid(null), 2600);
      }
    } catch {
      onError("That didn't reach her. Try it again.");
      later(() => onError(null), 4000);
    }
  };

  const catAct = async (act: CatAct) => {
    play("mrrp");
    if (act === "shelf") setShelfAt(Date.now());
    try {
      setView(await doCatAct(id, act));
    } catch (e) {
      onError(e instanceof Error ? e.message : "Couldn't do that.");
    }
  };

  const boxOut = async (on: boolean) => {
    play("thump");
    try {
      setView(await doBoxOut(id, on));
    } catch (e) {
      onError(e instanceof Error ? e.message : "Couldn't put the box out.");
    }
  };

  const leaveOut = async (treat: Treat) => {
    play("settle");
    try {
      setView(await doLeaveOut(id, treat));
    } catch (e) {
      onError(e instanceof Error ? e.message : "Couldn't leave that out.");
    }
  };

  const leaveGift = async (gift: Gift) => {
    play("settle");
    // Clear the words first. Tapping a second gift while they sat in the box sent them twice.
    const words = giftWords;
    setGiftWords("");
    try {
      setView(await doLeaveGift(id, gift, words));
    } catch (e) {
      setGiftWords(words);
      onError(e instanceof Error ? e.message : "Couldn't leave that.");
    }
  };

  const tell = async (m: Mood) => {
    play("chirp");
    setNudge((v) => v + 1);
    setView((v) => (v ? { ...v, catMood: m, catMoodAt: Date.now() } : v));
    try {
      setView(await doTell(id, m));
    } catch {
      void load();
    }
  };

  return {
    tidy,
    bedding,
    pickBlanket,
    touchWindowLight,
    mugFell,
    petAt,
    drawing,
    hangUp,
    giftWords,
    setGiftWords,
    strokes,
    setStrokes,
    photoOver,
    setPhotoOver,
    sharePoke,
    stroke,
    waitAtDoor,
    settleIn,
    sitWith,
    act,
    catAct,
    boxOut,
    leaveOut,
    leaveGift,
    tell,
  };
}
