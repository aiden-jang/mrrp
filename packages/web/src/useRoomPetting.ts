import { useCallback, useEffect, useRef, useState } from "react";
import { doHold } from "./api.js";

export const PET_TAP_MS = 1800;

export function useRoomPetting(id: string) {
  const [petAt, setPetAt] = useState<number | null>(null);
  const contact = useRef({ pointer: false, tap: false, sent: false, sending: false });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sync = useCallback(async () => {
    const state = contact.current;
    if (state.sending) return;
    state.sending = true;
    try {
      while (state.sent !== (state.pointer || state.tap)) {
        state.sent = state.pointer || state.tap;
        await doHold(id, state.sent);
      }
    } finally {
      state.sending = false;
    }
  }, [id]);
  const hold = useCallback(
    (on: boolean) => {
      contact.current.pointer = on;
      void sync();
    },
    [sync],
  );
  const pet = () => {
    clearTimeout(timer.current);
    contact.current.tap = true;
    setPetAt(Date.now());
    void sync();
    timer.current = setTimeout(() => {
      contact.current.tap = false;
      setPetAt(null);
      void sync();
    }, PET_TAP_MS);
  };
  useEffect(() => {
    const stop = () => {
      clearTimeout(timer.current);
      contact.current.pointer = contact.current.tap = false;
      void sync();
    };
    const interrupt = () => {
      stop();
      setPetAt(null);
    };
    const hidden = () => {
      if (document.hidden) interrupt();
    };
    window.addEventListener("blur", interrupt);
    window.addEventListener("offline", interrupt);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      stop();
      window.removeEventListener("blur", interrupt);
      window.removeEventListener("offline", interrupt);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [sync]);
  return { petAt, hold, pet };
}
