import { useCallback, useEffect, useRef, useState } from "react";
import { sendSeek } from "./hideSeekApi.js";
import { HIDE_SPOTS, type HideSeekCommand, type RoomView } from "./types.js";

export function useHideSeek(id: string, view: RoomView | null | undefined, load: () => Promise<void>) {
  const [hideSeekPending, setPending] = useState(false);
  const [hideSeekError, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const alive = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const seek = useCallback(
    async (kind: HideSeekCommand["kind"], spot?: HideSeekCommand["spot"]) => {
      if (pending.current) return;
      pending.current = true;
      setPending(true);
      setError(null);
      try {
        await sendSeek(id, { kind, round: view?.hideSeek?.id ?? null, ...(spot ? { spot } : {}) });
        if (alive.current) await load();
      } catch (error) {
        if (alive.current) {
          await load().catch(() => undefined);
          if (alive.current)
            setError(error instanceof Error ? error.message : "Couldn’t share that. Try again.");
        }
      } finally {
        pending.current = false;
        if (alive.current) setPending(false);
      }
    },
    [id, view?.hideSeek?.id, load],
  );
  const searchProp = useCallback(
    (prop: string) => {
      const spot = HIDE_SPOTS.find((s) => s.prop === prop);
      if (
        !view?.youAreHer &&
        view?.hideSeek?.phase === "hiding" &&
        spot &&
        !view.hideSeek.checked.includes(spot.id)
      )
        void seek("search", spot.id);
    },
    [seek, view?.youAreHer, view?.hideSeek],
  );
  return { hideSeekPending, hideSeekError, seek, searchProp };
}
