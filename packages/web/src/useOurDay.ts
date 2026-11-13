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
  const [saved, setSaved] = useState<{ date: string; label: string } | null>(null);
  const [baseline, setBaseline] = useState({ date: "", label: "" });
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const loaded = useRef(false);
  const clearKept = useRef(0);

  useEffect(() => () => window.clearTimeout(clearKept.current), []);

  useEffect(() => {
    if (loaded.current || !view) return;
    loaded.current = true;
    const initial = {
      date: view.ourDay ? `2000-${pad(view.ourDay.month)}-${pad(view.ourDay.day)}` : "",
      label: view.ourDay?.label ?? "",
    };
    setDate(initial.date);
    setLabel(initial.label);
    setBaseline(initial);
  }, [view]);

  const save = async () => {
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    setSaved(null);
    const submitted = { date, label };
    const [, mm, dd] = date.match(/^\d{4}-(\d{2})-(\d{2})$/) ?? [];
    const words = label.trim();
    try {
      await doOurDay(id, mm && dd && words ? { month: Number(mm), day: Number(dd), label: words } : null);
      await reload();
      setSaved(submitted);
      setBaseline(submitted);
      window.clearTimeout(clearKept.current);
      clearKept.current = window.setTimeout(() => setSaved(null), KEPT_MS);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Couldn't keep that day.");
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };

  return {
    date,
    setDate,
    label,
    setLabel,
    saved: saved?.date === date && saved?.label === label,
    saving,
    dirty: baseline.date !== date || baseline.label !== label,
    save,
  };
}
