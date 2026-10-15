import { useSyncExternalStore } from "react";
import type { LiveState } from "./live.js";
import s from "./App.module.css";

function subscribe(notify: () => void) {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
}

export function ConnectionNotice({ live }: { live: LiveState }) {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine);
  if (online && live === "open") return null;
  return (
    <p className={s.errorBar} role="status" style={{ width: "calc(100vw - 24px)", boxSizing: "border-box" }}>
      {!online
        ? "You’re offline. Keep this tab open for unsaved drafts. Reconnect before sending."
        : live === "closed"
          ? "Live connection interrupted. Reconnecting; the room also checks for updates every 15 seconds. Wait for confirmation after sending."
          : "Connecting to the room. Wait for confirmation after sending."}
    </p>
  );
}
