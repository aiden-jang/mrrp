import { useEffect, useRef, useState } from "react";
import type { RoomView } from "./types.js";
import { myToken } from "./api.js";

/*
 * The room, pushed rather than polled.
 *
 * Before this, the client re-read the room every 15 seconds and "you are both in here right now"
 * meant "the other one made a request in the last three minutes". The cat already had a whole
 * greeting built for co-presence and it was being fed by a signal too slow to feel like presence.
 *
 * The socket only ever receives. Everything that changes the room still goes through the ordinary
 * routes, where the seat checks are, so this cannot become a second way to write.
 */
export type LiveState = "connecting" | "open" | "closed";

/* Long enough that a dead socket is not a busy loop, short enough that a flaky tunnel recovers. */
const BACKOFF_MS = [1_000, 2_000, 5_000, 10_000, 20_000];

export function useLive(
  id: string,
  enabled: boolean,
  onView: (v: RoomView) => void,
  onGone: () => void,
): LiveState {
  const [state, setState] = useState<LiveState>("connecting");
  // Kept in refs so a new view does not tear the socket down and build another one.
  const view = useRef(onView);
  view.current = onView;
  const gone = useRef(onGone);
  gone.current = onGone;

  useEffect(() => {
    if (!enabled) return;
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let stopped = false;

    const open = () => {
      if (stopped) return;
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const url = `${proto}//${window.location.host}/api/room/${id}/live?me=${encodeURIComponent(myToken())}`;
      let socket: WebSocket;
      try {
        socket = new WebSocket(url);
      } catch {
        return schedule();
      }
      ws = socket;
      socket.onopen = () => {
        attempt = 0;
        setState("open");
      };
      socket.onmessage = (e) => {
        if (typeof e.data !== "string" || e.data === "pong") return;
        const msg = JSON.parse(e.data) as { type: string; view?: RoomView };
        if (msg.type === "gone") {
          stopped = true;
          gone.current();
          return;
        }
        if (msg.type === "view" && msg.view) view.current(msg.view);
      };
      socket.onclose = () => {
        setState("closed");
        schedule();
      };
      socket.onerror = () => socket.close();
    };

    const schedule = () => {
      if (stopped || retry) return;
      const wait = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)]!;
      attempt += 1;
      retry = setTimeout(() => {
        retry = null;
        open();
      }, wait);
    };

    open();
    // A tab that was asleep comes back holding a socket the server closed hours ago.
    const wake = () => {
      if (document.hidden || ws?.readyState === WebSocket.OPEN) return;
      attempt = 0;
      if (retry) {
        clearTimeout(retry);
        retry = null;
      }
      open();
    };
    document.addEventListener("visibilitychange", wake);

    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", wake);
      if (retry) clearTimeout(retry);
      ws?.close();
    };
  }, [id, enabled]);

  return state;
}
