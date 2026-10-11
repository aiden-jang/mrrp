import type { RoomDecor } from "./types.js";
import { ROOM_PALETTES } from "./roomDecor.js";
import s from "./App.module.css";

export function RoomDecorPicker({
  value,
  onChange,
}: {
  value: RoomDecor;
  onChange: (decor: RoomDecor) => void;
}) {
  return (
    <fieldset className={s.decorPicker}>
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
        <label>
          Rug
          <select
            aria-label="Rug"
            value={value.rug}
            onChange={(e) => onChange({ ...value, rug: e.target.value as RoomDecor["rug"] })}
          >
            <option value="plain">Plain</option>
            <option value="stripe">Stripes</option>
            <option value="check">Checks</option>
          </select>
        </label>
        <label>
          Wall print
          <select
            aria-label="Wall print"
            value={value.art}
            onChange={(e) => onChange({ ...value, art: e.target.value as RoomDecor["art"] })}
          >
            <option value="fish">Fish</option>
            <option value="moon">Moon</option>
            <option value="flower">Flower</option>
          </select>
        </label>
        <label>
          Mug
          <select
            aria-label="Mug"
            value={value.mug}
            onChange={(e) => onChange({ ...value, mug: e.target.value as RoomDecor["mug"] })}
          >
            <option value="cloud">Cloud</option>
            <option value="rose">Rose</option>
            <option value="ink">Ink</option>
          </select>
        </label>
      </div>
      <p className={s.small}>Your drawing or cat photo gets the frame first.</p>
    </fieldset>
  );
}
