import { useEffect, useRef, useState } from "react";
import { doOurDay } from "./api.js";
import type { RoomView } from "./types.js";

const pad = (n: number) => String(n).padStart(2, "0");

/*
 * One date in the year the cat says something on. The room stores a month and a day with no year,
 * because it comes round every year, but `<input type="date">` will not hold a value without one.
 * 2000 is the carrier: it is a leap year, so the 29th of February survives the round trip.
 *
 * Loaded from the room once and then left alone. Re-syncing on every poll would overwrite the date
 * being typed, and the room sends a new view every few seconds.
 */
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
      window.setTimeout(() => setSaved(false), 2400);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Couldn't keep that day.");
    }
  };

  return { date, setDate, label, setLabel, saved, save };
}
