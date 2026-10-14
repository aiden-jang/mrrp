import type { RefObject } from "react";
import s from "./App.module.css";
import { TheyLeftNotice } from "./screens.js";
import type { RoomView } from "./types.js";
import type { useCatSetup } from "./useCatSetup.js";

export function RoomWaiting({
  view,
  cat,
  setupTrigger,
  shareResult,
  onShare,
}: {
  view: RoomView;
  cat: ReturnType<typeof useCatSetup>;
  setupTrigger: RefObject<HTMLButtonElement>;
  shareResult: "copied" | "shared" | null;
  onShare: () => void;
}) {
  const setup = cat.open;
  return (
    <>
      {view.theyLeft ? (
        <TheyLeftNotice name={view.theyLeft.name} until={view.theyLeft.until} />
      ) : (
        <>
          <p className={s.newsMain}>Nobody else is here yet.</p>
          <p className={s.small} style={{ textAlign: "center" }}>
            Send this link to the one person it's for. Whoever opens it second is the one the cat is.
          </p>
        </>
      )}
      {!setup && (
        <button
          ref={setupTrigger}
          className={s.btn}
          style={{ width: "100%", marginTop: 12 }}
          disabled={cat.loading}
          onClick={() => void cat.start()}
          aria-expanded={setup}
        >
          Write her notes, name her, or decorate the room
        </button>
      )}
      <button
        className={`${s.btn} ${view.theyLeft ? "" : s.btnGo}`}
        style={{ width: "100%", marginTop: 8 }}
        onClick={() => onShare()}
      >
        {shareResult === "shared"
          ? "Sent."
          : shareResult === "copied"
            ? "Copied. Go send it."
            : view.theyLeft
              ? "Send the link to somebody else"
              : "Send her the link"}
      </button>
    </>
  );
}
