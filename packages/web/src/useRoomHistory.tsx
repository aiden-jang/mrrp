import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { doUnsay, fetchSaid } from "./api.js";
import { SaidPanel } from "./screens.js";
import type { RoomView, SaidSoFar } from "./types.js";
import s from "./App.module.css";

export function useRoomHistory(
  id: string,
  view: RoomView | null,
  setView: Dispatch<SetStateAction<RoomView | null>>,
  onError: (message: string) => void,
) {
  // The day this seat named. Each of them has one and neither is ever shown the other's.
  const [said, setSaid] = useState<SaidSoFar | null>(null);
  const [loading, setLoading] = useState(false);
  const [takingBack, setTakingBack] = useState<number | null>(null);
  const busy = useRef(false);
  const alive = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      generation.current += 1;
    };
  }, []);
  const saidTrigger = useRef<HTMLButtonElement>(null);
  const saidPanel = useRef<HTMLElement>(null);
  const wasSaid = useRef(false);

  const takeBack = async (at: number) => {
    if (busy.current) return;
    busy.current = true;
    setTakingBack(at);
    const request = ++generation.current;
    try {
      const next = await doUnsay(id, at);
      if (!alive.current) return;
      setView(next);
      const history = await fetchSaid(id);
      if (alive.current && request === generation.current) setSaid(history);
    } catch (e) {
      if (alive.current) onError(e instanceof Error ? e.message : "Couldn't take that back.");
    } finally {
      busy.current = false;
      if (alive.current) setTakingBack(null);
    }
  };

  const openSaid = async () => {
    if (busy.current || said) return;
    busy.current = true;
    setLoading(true);
    const request = ++generation.current;
    try {
      const history = await fetchSaid(id);
      if (alive.current && request === generation.current) setSaid(history);
    } catch (e) {
      if (alive.current) onError(e instanceof Error ? e.message : "Couldn't get that.");
    } finally {
      busy.current = false;
      if (alive.current) setLoading(false);
    }
  };

  useEffect(() => {
    const open = said !== null;
    if (open && !wasSaid.current) saidPanel.current?.focus();
    if (!open && wasSaid.current) saidTrigger.current?.focus();
    wasSaid.current = open;
  }, [said]);

  const saidBack = loading ? (
    <p className={s.small} role="status">
      Opening your notes…
    </p>
  ) : said && view?.them ? (
    <SaidPanel
      said={said}
      youAreHer={view.youAreHer}
      them={view.them}
      onClose={() => {
        generation.current += 1;
        setSaid(null);
      }}
      takingBack={takingBack}
      onUnsay={view.youAreHer ? (at) => void takeBack(at) : undefined}
      panelRef={saidPanel}
    />
  ) : null;
  return { panel: saidBack, trigger: saidTrigger, open: openSaid, loading };
}
