import { reportAnalytics } from "../../../analytics/browser.js";
import { DEFAULT_DECOR } from "./roomDecor.js";
import { useState } from "react";
import { doClock, doDress, doNotes, fetchNotes } from "./api.js";
import { EYES, LOOKS } from "./looks.js";
import { play } from "./sound.js";
import type { RoomDecor, RoomView } from "./types.js";

export type CatSetupDraft = {
  decor: RoomDecor;
  name: string;
  look: string;
  eyes: string;
  tz: string;
  homeHour: number;
  notes: string;
};

// The room view omits notes. Only a successful fetch may create an editable draft.
export function useCatSetup(id: string, view: RoomView | null, reload: () => Promise<void>) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CatSetupDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    if (!view) return;
    setLoading(true);
    setError(null);
    try {
      const notes = await fetchNotes(id);
      const look =
        LOOKS.find((l) => l.cat.fur.toLowerCase() === view.cat.fur.toLowerCase())?.id ?? LOOKS[0]!.id;
      const eyes = EYES.find((e) => e.hex.toLowerCase() === view.cat.eyes.toLowerCase())?.id ?? EYES[0]!.id;
      setDraft({
        decor: view.decor ?? DEFAULT_DECOR,
        name: view.cat.name,
        look,
        eyes,
        tz: view.clock.tz,
        homeHour: view.clock.homeHour,
        notes: notes.join("\n"),
      });
      setOpen(true);
    } catch {
      setError("Couldn’t load your notes. Try again; your saved notes haven’t changed.");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!draft) return false;
    play("settle");
    const look = LOOKS.find((l) => l.id === draft.look)!;
    const eyes = EYES.find((e) => e.id === draft.eyes)!;
    setSaving(true);
    setError(null);
    try {
      await doDress(id, { name: draft.name.trim() || "Bean", ...look.cat, eyes: eyes.hex }, draft.decor);
      await doClock(id, { tz: draft.tz, homeHour: draft.homeHour });
      await doNotes(id, draft.notes.split("\n"));
      reportAnalytics({ name: "cat_configured" });
      setOpen(false);
      await reload();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that.");
    } finally {
      setSaving(false);
    }
    return false;
  };

  const preview =
    view && open && draft
      ? {
          ...view.cat,
          name: draft.name.trim() || "Bean",
          ...LOOKS.find((look) => look.id === draft.look)!.cat,
          eyes: EYES.find((eyes) => eyes.id === draft.eyes)!.hex,
        }
      : (view?.cat ?? null);
  return { open, draft, preview, setDraft, loading, saving, error, start, save, close: () => setOpen(false) };
}
