import type { RoomDecor } from "./types.js";
import { mugColors, ROOM_ART, ROOM_PALETTES } from "./roomDecor.js";
import s from "./App.module.css";

const choices = {
  rug: [
    ["plain", "Plain"],
    ["stripe", "Stripes"],
    ["check", "Checks"],
  ],
  art: [
    ["fish", "Fish"],
    ["moon", "Moon"],
    ["flower", "Flower"],
  ],
  mug: [
    ["cloud", "Cloud"],
    ["rose", "Rose"],
    ["ink", "Ink"],
  ],
} as const;
const labels = { rug: "Rug", art: "Wall print", mug: "Mug" };

function PrintPreview({ art }: { art: RoomDecor["art"] }) {
  const sprite = ROOM_ART[art];
  const palette: Record<string, string> = { w: "#4a3520", f: "#c69a63", h: "#cfe0e4", g: "#e2926f" };
  return (
    <svg
      width="63"
      height="45"
      viewBox={`0 0 ${sprite.w} ${sprite.h}`}
      aria-hidden="true"
      style={{ shapeRendering: "crispEdges" }}
    >
      {sprite.rows.flatMap((row, y) =>
        [...row].map((cell, x) =>
          palette[cell] ? (
            <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={palette[cell]} />
          ) : null,
        ),
      )}
    </svg>
  );
}

export function RoomDecorPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: RoomDecor;
  onChange: (decor: RoomDecor) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className={s.decorPicker} disabled={disabled}>
      <legend>The room</legend>
      <p className={s.small}>A little interior design. The cat has not been consulted.</p>
      <div className={s.decorPalettes} role="group" aria-label="Room palette">
        {Object.entries(ROOM_PALETTES).map(([key, palette]) => (
          <button
            type="button"
            key={key}
            aria-pressed={value.palette === key}
            onClick={() => onChange({ ...value, palette: key as RoomDecor["palette"] })}
          >
            <span aria-hidden style={{ background: palette.wall, borderColor: palette.floor }} />
            {palette.label}
          </button>
        ))}
      </div>
      <div className={s.decorObjects}>
        {(Object.keys(choices) as (keyof typeof choices)[]).map((kind) => (
          <fieldset className={s.decorObject} key={kind}>
            <legend>{labels[kind]}</legend>
            <div className={s.decorChoices}>
              {choices[kind].map(([key, label]) => (
                <button
                  type="button"
                  className={`${s.btn} ${s.decorChoice}`}
                  key={key}
                  aria-pressed={value[kind] === key}
                  onClick={() => onChange({ ...value, [kind]: key })}
                >
                  {kind === "art" ? (
                    <PrintPreview art={key as RoomDecor["art"]} />
                  ) : kind === "rug" ? (
                    <span className={s.decorRug} data-pattern={key} aria-hidden="true" />
                  ) : (
                    <span
                      className={s.decorMug}
                      style={{ background: mugColors({ ...value, mug: key as RoomDecor["mug"] }).c }}
                      aria-hidden="true"
                    />
                  )}
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <p className={s.small}>Your drawing or cat photo gets the frame first.</p>
    </fieldset>
  );
}
