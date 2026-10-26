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
  const pending = useRef(false);

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
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    try {
      applyView(await doSay(id, text, replyTo ?? undefined));
      play("settle");
      onSaid();
      setOpen(false);
      setReplyTo(null);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Couldn't send that. Your words are still here.");
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };

  const clearTap = async () => {
    if (pending.current) return;
    if (!clearing) return setClearing(true);
    pending.current = true;
    setClearing(false);
    setSaving(true);
    try {
      applyView(await doSay(id, ""));
      setOpen(false);
      setReplyTo(null);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Couldn't do that.");
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };

  return { text, setText, open, replyTo, saving, clearing, boxRef, start, neverMind, say, clearTap };
}
