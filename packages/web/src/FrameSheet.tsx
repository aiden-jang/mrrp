import { useEffect, useRef, useState } from "react";
import s from "./App.module.css";
import d from "./FrameSheet.module.css";
import {
  BLANK,
  cellAt,
  DOODLE_CELLS,
  DOODLE_H,
  DOODLE_INK,
  DOODLE_NAMES,
  DOODLE_W,
  isBlank,
  withCell,
} from "./doodle.js";

export function FrameSheet({
  current,
  saving,
  onSave,
  onEditingChange,
}: {
  current: { cells: string; mine: boolean } | null;
  saving: boolean;
  onSave: (cells: string) => Promise<boolean>;
  onEditingChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(BLANK);
  const [ink, setInk] = useState(1);
  const [activeCell, setActiveCell] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const sheetRef = useRef(BLANK);
  const trigger = useRef<HTMLButtonElement>(null);
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  const wasOpen = useRef(false);
  const painting = useRef<number | null>(null);
  const freshStroke = useRef(true);
  useEffect(() => {
    onEditingChange?.(open);
    return () => onEditingChange?.(false);
  }, [open, onEditingChange]);
  useEffect(() => {
    if (open) cells.current[0]?.focus();
    else if (wasOpen.current) trigger.current?.focus();
    wasOpen.current = open;
  }, [open]);
  useEffect(() => {
    const up = (e: PointerEvent) => {
      if (e.pointerId === painting.current) painting.current = null;
    };
    const blur = () => (painting.current = null);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  if (!open) {
    return (
      <button
        ref={trigger}
        className={current ? s.sheetPeek : s.quiet}
        onClick={() => {
          sheetRef.current = current?.cells ?? BLANK;
          setSheet(sheetRef.current);
          setHistory([]);
          painting.current = null;
          setInk(1);
          setActiveCell(0);
          setOpen(true);
        }}
      >
        {current ? (
          <>
            <span className={s.sheetPeekLabel}>{current.mine ? "you put this up" : "on the wall"}</span>
            <Sheet cells={current.cells} />
          </>
        ) : (
          "Draw something for the frame"
        )}
      </button>
    );
  }

  const paint = (x: number, y: number) => {
    if (saving) return;
    const previous = sheetRef.current;
    const next = withCell(previous, x, y, ink);
    if (next === previous) return;
    if (painting.current === null || freshStroke.current) {
      setHistory((entries) => [...entries.slice(-49), previous]);
      freshStroke.current = false;
    }
    sheetRef.current = next;
    setSheet(next);
  };

  return (
    <div
      className={`${s.panel} ${d.drawingPanel}`}
      onKeyDown={(e) => {
        if (e.key === "Escape" && !saving) {
          e.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <p className={s.panelTitle}>for the frame</p>
      <p id="drawing-help" className={s.small} style={{ marginBottom: 10 }}>
        Pick an ink and draw.{" "}
        <span className={s.keyboardHint}>Arrow keys move; Space paints. Escape closes.</span>
      </p>
      <div className={d.toolbar}>
        <button
          className={s.quiet}
          disabled={saving || !history.length}
          onClick={() => {
            sheetRef.current = history[history.length - 1]!;
            setSheet(sheetRef.current);
            setHistory((entries) => entries.slice(0, -1));
            painting.current = null;
          }}
        >
          Undo
        </button>
        <button
          className={s.quiet}
          disabled={saving || isBlank(sheet)}
          onClick={() => {
            const previous = sheetRef.current;
            setHistory((entries) => [...entries.slice(-49), previous]);
            sheetRef.current = BLANK;
            setSheet(BLANK);
            painting.current = null;
          }}
        >
          Clear
        </button>
      </div>
      <div
        className={s.sheetGrid}
        role="group"
        aria-label={`Drawing, ${DOODLE_W} by ${DOODLE_H}`}
        aria-describedby="drawing-help"
        style={{ gridTemplateColumns: `repeat(${DOODLE_W}, 1fr)` }}
      >
        {Array.from({ length: DOODLE_CELLS }, (_, i) => {
          const x = i % DOODLE_W;
          const y = Math.floor(i / DOODLE_W);
          const at = cellAt(sheet, x, y);
          return (
            <button
              key={i}
              ref={(node) => {
                cells.current[i] = node;
              }}
              tabIndex={activeCell === i ? 0 : -1}
              disabled={saving}
              onFocus={() => setActiveCell(i)}
              onKeyDown={(e) => {
                const next =
                  e.key === "ArrowRight"
                    ? Math.min(i + 1, DOODLE_CELLS - 1)
                    : e.key === "ArrowLeft"
                      ? Math.max(i - 1, 0)
                      : e.key === "ArrowDown"
                        ? Math.min(i + DOODLE_W, DOODLE_CELLS - 1)
                        : e.key === "ArrowUp"
                          ? Math.max(i - DOODLE_W, 0)
                          : null;
                if (next !== null) {
                  e.preventDefault();
                  cells.current[next]?.focus();
                }
              }}
              className={s.sheetCell}
              style={{ background: DOODLE_INK[at] || "transparent" }}
              aria-label={`Row ${y + 1}, column ${x + 1}: ${DOODLE_NAMES[at]}`}
              onPointerDown={(e) => {
                if (saving || painting.current !== null) return;
                e.currentTarget.releasePointerCapture?.(e.pointerId);
                painting.current = e.pointerId;
                freshStroke.current = true;
                paint(x, y);
              }}
              onPointerEnter={(e) => painting.current === e.pointerId && paint(x, y)}
              onClick={(e) => {
                if (e.detail === 0) paint(x, y);
              }}
            />
          );
        })}
      </div>

      <div className={s.inkRow}>
        {DOODLE_INK.map((hex, i) => (
          <button
            key={i}
            disabled={saving}
            className={s.inkDot}
            aria-label={DOODLE_NAMES[i]}
            aria-pressed={ink === i}
            title={DOODLE_NAMES[i]}
            style={{
              background: hex || "var(--panel)",
              boxShadow: ink === i ? "0 0 0 2.5px var(--honey)" : "inset 0 0 0 1px var(--line)",
            }}
            onClick={() => setInk(i)}
          />
        ))}
      </div>

      <div className={d.actions}>
        <button className={s.btn} disabled={saving} onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button
          className={`${s.btn} ${s.btnGo}`}
          disabled={saving}
          onClick={async () => {
            if (await onSave(sheet)) setOpen(false);
          }}
        >
          {saving ? "Hanging…" : isBlank(sheet) && current ? "Take it down" : "Hang it up"}
        </button>
      </div>
    </div>
  );
}

export function Sheet({ cells }: { cells: string }) {
  return (
    <span className={s.sheetMini} style={{ gridTemplateColumns: `repeat(${DOODLE_W}, 1fr)` }} aria-hidden>
      {Array.from({ length: DOODLE_CELLS }, (_, i) => (
        <span
          key={i}
          style={{
            background: DOODLE_INK[cellAt(cells, i % DOODLE_W, Math.floor(i / DOODLE_W))] || "transparent",
          }}
        />
      ))}
    </span>
  );
}
