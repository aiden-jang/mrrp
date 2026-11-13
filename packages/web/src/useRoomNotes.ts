import { useRef, useState } from "react";
import { fetchNotes, saveRoomNotes } from "./api.js";
import { play } from "./sound.js";

export function useRoomNotes(id: string, reload: () => Promise<void>) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);

  const start = async () => {
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setError(null);
    try {
      setDraft(await fetchNotes(id));
      setOpen(true);
    } catch {
      setError("Couldn’t load your notes. Try again; your saved notes haven’t changed.");
    } finally {
      pending.current = false;
      setLoading(false);
    }
  };

  const save = async () => {
    if (!draft || pending.current) return false;
    pending.current = true;
    setSaving(true);
    setError(null);
    try {
      await saveRoomNotes(id, draft);
      play("settle");
      setOpen(false);
      await reload();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save your notes. Your words are still here.");
      return false;
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };

  const close = () => {
    if (pending.current) return;
    setOpen(false);
    setError(null);
  };
  return { open, draft, setDraft, loading, saving, error, start, save, close };
}
