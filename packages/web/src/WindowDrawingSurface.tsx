import { useRef, useState, useCallback, useEffect, type PointerEvent } from "react";
import {
  WINDOW_HEIGHT,
  WINDOW_WIDTH,
  WINDOW_POINTS_MAX,
  type WindowPoint,
  type WindowStroke,
} from "./types.js";
import s from "./App.module.css";
import d from "./WindowDrawing.module.css";

export const WINDOW_INK_COLORS = { ink: "#4a3520", rose: "#995569", leaf: "#4e6b46" };

export function WindowDrawingSurface({
  strokes,
  ink,
  disabled,
  onStroke,
  helpId,
}: {
  strokes: WindowStroke[];
  ink: WindowStroke["ink"];
  disabled: boolean;
  onStroke: (stroke: WindowStroke) => boolean;
  helpId: string;
}) {
  const [active, setActive] = useState<WindowPoint[]>([]);
  const [cursor, setCursor] = useState<WindowPoint>([32, 20]);
  const [keyboard, setKeyboard] = useState(false);
  const points = useRef<WindowPoint[]>([]);
  const pointer = useRef<number | null>(null);
  const drawing = useRef(false);
  const activeInk = useRef(ink);
  const finish = useCallback(() => {
    if (!points.current.length) return;
    if (!onStroke({ id: crypto.randomUUID(), ink: activeInk.current, points: points.current })) return;
    points.current = [];
    drawing.current = false;
    setActive([]);
  }, [onStroke]);
  useEffect(() => {
    const end = () => {
      pointer.current = null;
      finish();
    };
    window.addEventListener("blur", end);
    return () => window.removeEventListener("blur", end);
  }, [finish]);
  const mark = (point: WindowPoint) => {
    if (disabled || points.current.length >= WINDOW_POINTS_MAX) return;
    if (!points.current.length) activeInk.current = ink;
    const last = points.current.at(-1);
    if (last?.[0] === point[0] && last[1] === point[1]) return;
    points.current = [...points.current, point];
    setActive(points.current);
  };
  const pointAt = (event: PointerEvent<SVGSVGElement>): WindowPoint => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return [
      Math.max(
        0,
        Math.min(
          WINDOW_WIDTH - 1,
          Math.round(((event.clientX - bounds.left) / bounds.width) * (WINDOW_WIDTH + 2) - 1),
        ),
      ),
      Math.max(
        0,
        Math.min(
          WINDOW_HEIGHT - 1,
          Math.round(((event.clientY - bounds.top) / bounds.height) * (WINDOW_HEIGHT + 2) - 1),
        ),
      ),
    ];
  };
  const stroke = (entry: Pick<WindowStroke, "ink" | "points">, key: string) =>
    entry.points.length === 1 ? (
      <circle
        key={key}
        cx={entry.points[0]![0]}
        cy={entry.points[0]![1]}
        r="0.5"
        fill={WINDOW_INK_COLORS[entry.ink]}
      />
    ) : (
      <polyline
        key={key}
        points={entry.points.map((p) => p.join(",")).join(" ")}
        fill="none"
        stroke={WINDOW_INK_COLORS[entry.ink]}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  return (
    <>
      <svg
        viewBox={`-1 -1 ${WINDOW_WIDTH + 2} ${WINDOW_HEIGHT + 2}`}
        className={d.surface}
        role="application"
        tabIndex={0}
        aria-label="Shared window drawing"
        aria-describedby={helpId}
        aria-disabled={disabled}
        onBlur={() => {
          pointer.current = null;
          finish();
        }}
        onPointerDown={(event) => {
          if (disabled || event.button !== 0 || pointer.current !== null || event.isPrimary === false) return;
          event.currentTarget.focus();
          setKeyboard(false);
          finish();
          pointer.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          mark(pointAt(event));
        }}
        onPointerMove={(event) => {
          if (pointer.current === event.pointerId) mark(pointAt(event));
        }}
        onPointerUp={(event) => {
          if (pointer.current === event.pointerId) {
            pointer.current = null;
            finish();
          }
        }}
        onPointerCancel={() => {
          pointer.current = null;
          finish();
        }}
        onLostPointerCapture={() => {
          pointer.current = null;
          finish();
        }}
        onKeyDown={(event) => {
          if (disabled) return;
          const movement: Record<string, WindowPoint> = {
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
            ArrowUp: [0, -1],
            ArrowDown: [0, 1],
          };
          const delta = movement[event.key];
          if (!delta && ![" ", "Enter", "Escape"].includes(event.key)) return;
          event.preventDefault();
          if (event.repeat && !delta) return;
          setKeyboard(true);
          if (delta) {
            const next: WindowPoint = [
              Math.max(0, Math.min(WINDOW_WIDTH - 1, cursor[0] + delta[0])),
              Math.max(0, Math.min(WINDOW_HEIGHT - 1, cursor[1] + delta[1])),
            ];
            setCursor(next);
            if (drawing.current) mark(next);
          } else if (event.key === "Escape" || drawing.current) finish();
          else {
            drawing.current = true;
            mark(cursor);
          }
        }}
      >
        {strokes.map((entry) => stroke(entry, entry.id))}
        {active.length > 0 && stroke({ ink: activeInk.current, points: active }, "draft")}
        {keyboard && (
          <circle cx={cursor[0]} cy={cursor[1]} r="1.3" fill="none" stroke="#4a3520" strokeWidth="0.25" />
        )}
      </svg>
      {keyboard && (
        <p className={s.srOnly} role="status">
          Row {cursor[1] + 1}, column {cursor[0] + 1}. {drawing.current ? "Drawing." : "Ready."}
        </p>
      )}
      {active.length >= WINDOW_POINTS_MAX && <p className={s.hint}>Finish this stroke to keep drawing.</p>}
    </>
  );
}
