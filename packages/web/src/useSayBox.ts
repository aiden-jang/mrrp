import { useEffect, useRef, useState } from "react";
import { doSay } from "./api.js";
import { play } from "./sound.js";
import type { RoomView } from "./types.js";

// Replies append to the named day. Clearing all replies requires a separate confirmation.
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
