import s from "./App.module.css";
import p from "./PostcardPreview.module.css";
import type { useRoomSharing } from "./useRoomSharing.js";
import { useEffect, useRef } from "react";

export function PostcardPreview({
  postcard,
  onClose,
}: {
  postcard: ReturnType<typeof useRoomSharing>;
  onClose: () => void;
}) {
  const { imageStatus, postcardHref } = postcard;
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (postcardHref) panel.current?.focus();
  }, [postcardHref]);
  if (!postcardHref) return null;
  const busy = imageStatus === "saving" || imageStatus === "sharing";
  return (
    <section ref={panel} tabIndex={-1} className={`${s.panel} ${p.preview}`} aria-label="Your postcard">
      <div className={p.heading}>
        <h2 className={s.panelTitle}>A moment to keep</h2>
        <button
          className={s.quiet}
          disabled={busy}
          onClick={() => {
            postcard.closePostcard();
            onClose();
          }}
        >
          Close preview
        </button>
      </div>
      <img src={postcardHref} alt="Your room postcard with its caption and date" />
      <div className={p.actions}>
        <button
          className={`${s.btn} ${s.btnGo}`}
          disabled={busy || imageStatus === "saved"}
          onClick={postcard.savePostcard}
        >
          Save postcard
        </button>
        {postcard.canSharePostcard && (
          <button className={s.btn} disabled={busy} onClick={() => void postcard.sharePostcard()}>
            {imageStatus === "sharing" ? "Opening sharing…" : "Share postcard"}
          </button>
        )}
      </div>
      {imageStatus === "saved" || imageStatus === "shared" ? (
        <p role="status" className={s.small}>
          {imageStatus === "saved" ? "Download started." : "Postcard shared."}
        </p>
      ) : null}
    </section>
  );
}
