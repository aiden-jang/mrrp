import { useEffect, useRef, useState } from "react";
import { heard } from "./heard.js";
import { play } from "./sound.js";
import type { RoomView } from "./types.js";

export function useRoomFeedback(view: RoomView | null, setup: boolean, draftName?: string) {
  const [nudge, setNudge] = useState(0);
  const [shelfAt, setShelfAt] = useState<number | null>(null);

  const wasTogether = useRef<boolean | null>(null);
  useEffect(() => {
    const now = view?.bothHereNow ?? false;
    const prev = wasTogether.current;
    wasTogether.current = now;
    if (prev === null || !now || prev) return;
    play("mrrp");
    setNudge((v) => v + 1);
    setArriving(true);
    stage.current?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "nearest",
    });
    const done = window.setTimeout(() => setArriving(false), 2000);
    return () => window.clearTimeout(done);
  }, [view?.bothHereNow]);

  const [arriving, setArriving] = useState(false);
  const stage = useRef<HTMLDivElement>(null);

  const heardName = useRef<string | null>(null);
  useEffect(() => {
    const called = draftName?.trim() ?? "";
    if (!setup) {
      heardName.current = null;
      return;
    }
    if (heardName.current === null) {
      heardName.current = called;
      return;
    }
    if (!called || called === heardName.current) return;
    const t = setTimeout(() => {
      heardName.current = called;
      play("chirp");
      setNudge((v) => v + 1);
    }, 900);
    return () => clearTimeout(t);
  }, [setup, draftName]);

  const heardMood = useRef<number | null>(null);
  const moodAt = view?.catMoodAt ?? null;
  useEffect(() => {
    if (moodAt === null) return;
    const before = heardMood.current;
    heardMood.current = moodAt;
    // Same rule as `heard`: the first view carries whatever she last said, possibly hours ago.
    if (before === null || moodAt <= before) return;
    play("chirp");
    setNudge((v) => v + 1);
  }, [moodAt]);

  const heardAt = useRef<number | null>(null);
  const theirLastAt = view?.theirRecent[0]?.at ?? null;
  const theirLastAction = view?.theirRecent[0]?.action ?? null;
  useEffect(() => {
    const cue = heard(heardAt.current, theirLastAt, theirLastAction);
    if (theirLastAt !== null) heardAt.current = theirLastAt;
    if (cue === false) return;
    if (theirLastAction === "shelf") setShelfAt(theirLastAt);
    if (cue) play(cue);
    setNudge((v) => v + 1);
  }, [theirLastAt, theirLastAction]);

  return { nudge, setNudge, shelfAt, setShelfAt, arriving, stage };
}
