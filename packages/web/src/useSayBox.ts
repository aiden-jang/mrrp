import { useEffect, useRef, useState } from "react";
import { doSay } from "./api.js";
import { play } from "./sound.js";
import type { RoomView } from "./types.js";

/*
 * Leaving him a line, and the box it is typed in.
 *
 * `replyTo` is the day being answered, not the line, so answering yesterday's note still adds a new
 * line rather than editing one. Every way in opens the box empty for the same reason: saving adds to
 * what you have said, and a prefilled box says the opposite.
 *
 * Clearing takes two taps and `clearing` is which tap you are on, because the server reads empty
 * text as "clear every line" and there is no undo behind it.
 */
export function useSayBox(
  id: string,
  applyView: (view: RoomView) => void,
  onSaid: () => void,
  onError: (message: string) => void,
) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text, open]);

  const start = (day: number | null) => {
    setText("");
    setReplyTo(day);
    setOpen(true);
  };

  const neverMind = () => {
    setOpen(false);
    setReplyTo(null);
    setClearing(false);
  };

  const say = async () => {
    setSaving(true);
    try {
      applyView(await doSay(id, text, replyTo ?? undefined));
      play("settle");
      onSaid();
      setOpen(false);
      setReplyTo(null);
    } catch {
      // Nothing sent. The box is still open with her words in it.
    }
    setSaving(false);
  };

  const clearTap = async () => {
    if (!clearing) return setClearing(true);
    setClearing(false);
    setSaving(true);
    try {
      applyView(await doSay(id, ""));
      setOpen(false);
      setReplyTo(null);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Couldn't do that.");
    }
    setSaving(false);
  };

  return { text, setText, open, replyTo, saving, clearing, boxRef, start, neverMind, say, clearTap };
}
