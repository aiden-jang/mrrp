import { useEffect, useState } from "react";
import type { Note } from "./types.js";

interface LetterState {
  identity: string;
  digest: string | null;
  open: boolean;
}

export function useNoteLetter(room: string | null, note: Note) {
  const identity = JSON.stringify([note.day, note.text]);
  const key = room ? `mrrp:opened-note:${room}` : null;
  const [state, setState] = useState<LetterState | null>(null);
  useEffect(() => {
    let disposed = false;
    const restore = async () => {
      try {
        const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(identity));
        const digest = Array.from(new Uint8Array(bytes), (n) => n.toString(16).padStart(2, "0")).join("");
        let open = false;
        try {
          open = key !== null && localStorage.getItem(key) === digest;
        } catch {
          // Opening still works when this preference cannot be read.
        }
        if (!disposed)
          setState((current) => ({
            identity,
            digest,
            open: current?.identity === identity ? current.open : open,
          }));
      } catch {
        // Without hashing, keep the preference in memory rather than saving her words.
      }
    };
    void restore();
    return () => {
      disposed = true;
    };
  }, [identity, key]);
  useEffect(() => {
    if (!key || state?.identity !== identity || !state.digest) return;
    try {
      if (state.open) localStorage.setItem(key, state.digest);
      else if (localStorage.getItem(key) === state.digest) localStorage.removeItem(key);
    } catch {
      // Private mode. The setting just does not survive a reload.
    }
  }, [identity, key, state]);
  return {
    open: state?.identity === identity && state.open,
    setOpen: (open: boolean) =>
      setState((current) => ({
        identity,
        digest: current?.identity === identity ? current.digest : null,
        open,
      })),
  };
}
