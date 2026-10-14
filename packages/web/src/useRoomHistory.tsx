import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { doUnsay, fetchSaid } from "./api.js";
import { SaidPanel } from "./screens.js";
import type { RoomView, SaidSoFar } from "./types.js";

export function useRoomHistory(
  id: string,
  view: RoomView | null,
  setView: Dispatch<SetStateAction<RoomView | null>>,
  onError: (message: string) => void,
) {
  // The day this seat named. Each of them has one and neither is ever shown the other's.
  const [said, setSaid] = useState<SaidSoFar | null>(null);
  const saidTrigger = useRef<HTMLButtonElement>(null);
  const saidPanel = useRef<HTMLElement>(null);
  const wasSaid = useRef(false);

  const takeBack = async (at: number) => {
    try {
      setView(await doUnsay(id, at));
      setSaid(await fetchSaid(id));
    } catch (e) {
      onError(e instanceof Error ? e.message : "Couldn't take that back.");
    }
  };

  const openSaid = async () => {
    try {
      setSaid(await fetchSaid(id));
    } catch (e) {
      onError(e instanceof Error ? e.message : "Couldn't get that.");
    }
  };

  useEffect(() => {
    const open = said !== null;
    if (open && !wasSaid.current) saidPanel.current?.focus();
    if (!open && wasSaid.current) saidTrigger.current?.focus();
    wasSaid.current = open;
  }, [said]);

  const saidBack =
    said && view?.them ? (
      <SaidPanel
        said={said}
        youAreHer={view.youAreHer}
        them={view.them}
        onClose={() => setSaid(null)}
        onUnsay={view.youAreHer ? (at) => void takeBack(at) : undefined}
        panelRef={saidPanel}
      />
    ) : null;
  return { panel: saidBack, trigger: saidTrigger, open: openSaid };
}
