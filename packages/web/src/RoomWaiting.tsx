import type { RefObject } from "react";
import s from "./App.module.css";
import { TheyLeftNotice } from "./screens.js";
import type { RoomView } from "./types.js";
import type { useCatSetup } from "./useCatSetup.js";
import type { useRoomNotes } from "./useRoomNotes.js";
import type { useRoomSharing } from "./useRoomSharing.js";
import { InviteLinkFallback } from "./InviteLinkFallback.js";

export function RoomWaiting({
  view,
  cat,
  setupTrigger,
  notes,
  notesTrigger,
  shareResult,
  onShare,
}: {
  view: RoomView;
  cat: ReturnType<typeof useCatSetup>;
  setupTrigger: RefObject<HTMLButtonElement>;
  notes: ReturnType<typeof useRoomNotes>;
  notesTrigger: RefObject<HTMLButtonElement>;
  shareResult: ReturnType<typeof useRoomSharing>["shareResult"];
  onShare: () => void;
}) {
  const setup = cat.open;
  return (
    <>
      {view.theyLeft ? (
        <TheyLeftNotice name={view.theyLeft.name} until={view.theyLeft.until} />
      ) : (
        <>
          <h2 className={s.newsMain}>Nobody else is here yet.</h2>
          <p className={s.small}>
            Send this link to the one person it's for. They can choose to enter as the cat.
          </p>
        </>
      )}
      <button
        className={`${s.btn} ${view.theyLeft ? "" : s.btnGo}`}
        style={{ width: "100%", marginTop: 8 }}
        onClick={() => onShare()}
        disabled={shareResult === "sharing"}
      >
        {shareResult === "sharing"
          ? "Opening sharing…"
          : shareResult === "failed"
            ? "Try sharing again"
            : shareResult === "shared"
              ? "Sent."
              : shareResult === "copied"
                ? "Copied. Go send it."
                : view.theyLeft
                  ? "Send the link to somebody else"
                  : "Send her the link"}
      </button>
      {shareResult === "failed" && <InviteLinkFallback />}
      {!setup && (
        <button
          ref={notesTrigger}
          className={s.btn}
          style={{ width: "100%", marginTop: 12 }}
          disabled={notes.loading}
          onClick={() => void notes.start()}
          aria-expanded={setup}
        >
          {notes.loading ? "Opening her notes…" : "Write her notes"}
        </button>
      )}
      <button ref={setupTrigger} className={s.quiet} disabled={notes.loading} onClick={cat.start}>
        Change the cat and room
      </button>
    </>
  );
}
