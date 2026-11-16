import { useCallback, useEffect, useRef, useState } from "react";
import { WINDOW_BATCH_MAX, type WindowDrawing, type WindowStroke } from "./types.js";
import { saveWindowStrokes } from "./windowDrawingApi.js";

export function useWindowDrawing(
  id: string,
  saved: WindowDrawing | null | undefined,
  load: () => Promise<void>,
) {
  const [windowDrawingOpen, setWindowDrawingOpen] = useState(false);
  const [draft, setDraft] = useState<WindowStroke[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ text: string; ids: string[] } | null>(null);
  const [receipt, setReceipt] = useState<WindowDrawing | null>(null);
  const draftRef = useRef(draft);
  const pendingRef = useRef(false);
  const alive = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    const ids = new Set(saved?.strokes.map((stroke) => stroke.id));
    draftRef.current = draftRef.current.filter((stroke) => !ids.has(stroke.id));
    setDraft((current) => (current.length === draftRef.current.length ? current : draftRef.current));
    setReceipt((current) => (current && saved && saved.revision >= current.revision ? null : current));
    setError((current) => (current?.ids.length && current.ids.every((id) => ids.has(id)) ? null : current));
  }, [saved]);
  const addStroke = useCallback((stroke: WindowStroke) => {
    if (pendingRef.current || draftRef.current.length >= WINDOW_BATCH_MAX) return false;
    draftRef.current = [...draftRef.current, stroke];
    setDraft(draftRef.current);
    setError(null);
    return true;
  }, []);
  const undoStroke = () => {
    if (pendingRef.current) return;
    draftRef.current = draftRef.current.slice(0, -1);
    setDraft(draftRef.current);
    setError(null);
  };
  const save = async () => {
    if (pendingRef.current || !draftRef.current.length) return;
    const submitted = draftRef.current;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    try {
      const confirmed = await saveWindowStrokes(id, submitted);
      if (!alive.current) return;
      setReceipt(confirmed);
      const ids = new Set(submitted.map((stroke) => stroke.id));
      draftRef.current = draftRef.current.filter((stroke) => !ids.has(stroke.id));
      setDraft(draftRef.current);
      await load().catch(() => undefined);
    } catch (cause) {
      if (
        alive.current &&
        submitted.some((stroke) => draftRef.current.some((local) => local.id === stroke.id))
      )
        setError({
          ids: submitted.map((stroke) => stroke.id),
          text: cause instanceof Error ? cause.message : "Couldn’t save your strokes. Try again.",
        });
    } finally {
      pendingRef.current = false;
      if (alive.current) setPending(false);
    }
  };
  const current = receipt && receipt.revision > (saved?.revision ?? -1) ? receipt : saved;
  const strokes = [
    ...new Map([...(current?.strokes ?? []), ...draft].map((stroke) => [stroke.id, stroke])).values(),
  ];
  return {
    windowDrawingReady: saved !== null && saved !== undefined,
    windowDrawingOpen,
    setWindowDrawingOpen,
    windowDrawingDirty: draft.length > 0,
    windowDrawingPending: pending,
    windowStrokes: strokes,
    windowDraft: draft,
    windowDrawingError: error?.text ?? null,
    addWindowStroke: addStroke,
    undoWindowStroke: undoStroke,
    saveWindowDrawing: save,
  };
}
