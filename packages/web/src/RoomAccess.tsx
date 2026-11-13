import { useState } from "react";
import { doRotate } from "./api.js";
import s from "./App.module.css";

export function RoomAccess({ id, reload }: { id: string; reload: () => Promise<void> }) {
  const [phase, setPhase] = useState<"ready" | "working" | "done">("ready");
  const [error, setError] = useState<string | null>(null);
  return (
    <details className={s.recovery}>
      <summary className={s.recoverySummary}>refresh room access</summary>
      <p className={s.small} style={{ marginTop: 8 }}>
        If a downloaded room copy was shared, stop older browsers from using your seat. They will need your
        recovery code or linked account to return. This browser, your recovery code, the other person’s seat
        and your other rooms stay as they are.
      </p>
      <button
        type="button"
        className={s.btn}
        style={{ marginTop: 10 }}
        disabled={phase === "working"}
        onClick={async () => {
          setPhase("working");
          setError(null);
          try {
            await doRotate(id);
            setPhase("done");
            await reload();
          } catch (e) {
            setPhase("ready");
            setError(e instanceof Error ? e.message : "Couldn't refresh access. Try again.");
          }
        }}
      >
        {phase === "working" ? "Replacing…" : "Replace my key"}
      </button>
      {phase === "done" && (
        <p className={s.small} role="status">
          Your key was replaced. Your recovery code stays the same.
        </p>
      )}
      {error && (
        <p className={s.small} style={{ color: "var(--error)", marginTop: 8 }} role="alert">
          {error}
        </p>
      )}
    </details>
  );
}
