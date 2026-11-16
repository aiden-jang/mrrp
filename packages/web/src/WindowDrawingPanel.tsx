import { useId, useState } from "react";
import { WINDOW_BATCH_MAX, WINDOW_INKS } from "./types.js";
import type { WindowStroke } from "./types.js";
import type { useRoomActions } from "./useRoomActions.js";
import { WindowDrawingSurface, WINDOW_INK_COLORS } from "./WindowDrawingSurface.js";
import s from "./App.module.css";
import d from "./WindowDrawing.module.css";

export function WindowDrawingPanel({ actions }: { actions: ReturnType<typeof useRoomActions> }) {
  const helpId = useId();
  const [ink, setInk] = useState<WindowStroke["ink"]>("ink");
  if (!actions.windowDrawingReady) return null;
  const busy = actions.windowDrawingPending;
  const full = actions.windowDraft.length >= WINDOW_BATCH_MAX;
  return (
    <details
      className={d.editor}
      open={actions.windowDrawingOpen}
      onToggle={(event) => actions.setWindowDrawingOpen(event.currentTarget.open)}
    >
      <summary>Draw on the window</summary>
      <p id={helpId} className={s.hint}>
        Draw a little something together. Arrow keys move the point; Enter starts or finishes a stroke.
      </p>
      <div className={d.inks} role="group" aria-label="Window drawing ink">
        {WINDOW_INKS.map((color) => (
          <button
            key={color}
            type="button"
            className={s.btn}
            aria-pressed={ink === color}
            disabled={busy}
            onClick={() => setInk(color)}
          >
            <span className={d.swatch} style={{ background: WINDOW_INK_COLORS[color] }} aria-hidden />
            {color === "ink" ? "Brown" : color === "rose" ? "Rose" : "Leaf"}
          </button>
        ))}
      </div>
      <WindowDrawingSurface
        strokes={actions.windowStrokes}
        ink={ink}
        disabled={busy || full}
        onStroke={actions.addWindowStroke}
        helpId={helpId}
      />
      <div className={d.actions}>
        <button
          type="button"
          className={s.btn}
          disabled={busy || !actions.windowDrawingDirty}
          onClick={actions.undoWindowStroke}
        >
          Undo unsaved stroke
        </button>
        <button
          type="button"
          className={`${s.btn} ${s.btnGo}`}
          disabled={busy || !actions.windowDrawingDirty}
          onClick={() => void actions.saveWindowDrawing()}
        >
          {busy ? "Saving…" : "Save strokes"}
        </button>
      </div>
      <p className={s.hint} role="status">
        {full
          ? "Save these strokes before drawing more."
          : actions.windowDrawingDirty
            ? "Your new strokes aren’t saved yet."
            : actions.windowStrokes.length
              ? "Your saved marks are here for both of you."
              : "The window is yours to draw on."}
      </p>
      {actions.windowDrawingError && (
        <p className={d.error} role="alert">
          {actions.windowDrawingError}
        </p>
      )}
    </details>
  );
}
