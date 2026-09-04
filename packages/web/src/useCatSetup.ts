import { useState } from "react";
import { doClock, doDress, doNotes, fetchNotes } from "./api.js";
import { EYES, LOOKS } from "./looks.js";
import { play } from "./sound.js";
import type { RoomView } from "./types.js";

type Draft = {
  name: string;
  look: string;
  eyes: string;
  tz: string;
  homeHour: number;
  notes: string;
};

/*
 * The panel edits a draft so the cat on screen can show a change while it is still being chosen.
 *
 * Open it with `start` and nothing else. The room view does not carry her notes, so a draft built
 * without fetching them first saves an empty list over whatever was there.
 */
export function useCatSetup(id: string, view: RoomView | null, reload: () => Promise<void>) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    if (!view) return;
    const notes = await fetchNotes(id).catch(() => [] as string[]);
    const look =
      LOOKS.find((l) => l.cat.fur.toLowerCase() === view.cat.fur.toLowerCase())?.id ?? LOOKS[0]!.id;
    const eyes = EYES.find((e) => e.hex.toLowerCase() === view.cat.eyes.toLowerCase())?.id ?? EYES[0]!.id;
    setDraft({
      name: view.cat.name,
      look,
      eyes,
      tz: view.clock.tz,
      homeHour: view.clock.homeHour,
      notes: notes.join("\n"),
    });
    setOpen(true);
  };

  const save = async () => {
    if (!draft) return;
    play("settle");
    const look = LOOKS.find((l) => l.id === draft.look)!;
    const eyes = EYES.find((e) => e.id === draft.eyes)!;
    setSaving(true);
    setError(null);
    try {
      await doDress(id, { name: draft.name.trim() || "Bean", ...look.cat, eyes: eyes.hex });
      await doClock(id, { tz: draft.tz, homeHour: draft.homeHour });
      await doNotes(id, draft.notes.split("\n"));
      setOpen(false);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that.");
    }
    setSaving(false);
  };

  return { open, draft, setDraft, saving, error, start, save, close: () => setOpen(false) };
}
