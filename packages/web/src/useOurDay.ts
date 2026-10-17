import { useEffect, useRef, useState } from "react";
import { doOurDay } from "./api.js";
import type { RoomView } from "./types.js";

const pad = (n: number) => String(n).padStart(2, "0");

const KEPT_MS = 2400;

// Carrier year 2000 preserves February 29. Load once so polling cannot overwrite the date draft.
export function useOurDay(
  id: string,
  view: RoomView | null,
  reload: () => Promise<void>,
  onError: (message: string) => void,
) {
  const [date, setDate] = useState("");
  const [label, setLabel] = useState("");
  const [saved, setSaved] = useState(false);
  const loaded = useRef(false);
  const clearKept = useRef(0);

  useEffect(() => () => window.clearTimeout(clearKept.current), []);

  useEffect(() => {
    if (loaded.current || !view) return;
    loaded.current = true;
    setDate(view.ourDay ? `2000-${pad(view.ourDay.month)}-${pad(view.ourDay.day)}` : "");
    setLabel(view.ourDay?.label ?? "");
  }, [view]);

  const save = async () => {
    const [, mm, dd] = date.match(/^\d{4}-(\d{2})-(\d{2})$/) ?? [];
    const words = label.trim();
    try {
      await doOurDay(id, mm && dd && words ? { month: Number(mm), day: Number(dd), label: words } : null);
      await reload();
      setSaved(true);
      window.clearTimeout(clearKept.current);
      clearKept.current = window.setTimeout(() => setSaved(false), KEPT_MS);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Couldn't keep that day.");
    }
  };

  return { date, setDate, label, setLabel, saved, save };
}
