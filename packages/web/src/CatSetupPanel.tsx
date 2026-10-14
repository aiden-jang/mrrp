import type { RefObject } from "react";
import s from "./App.module.css";
import editor from "./CatSetupPanel.module.css";
import { EYES, LOOKS, timezones } from "./looks.js";
import { RecoveryCode, Select } from "./RoomControls.js";
import { RoomDecorPicker } from "./RoomDecorPicker.js";
import { NOTE_MAX, NOTES_KEPT, type RoomView } from "./types.js";
import type { useCatSetup } from "./useCatSetup.js";

export function CatSetupPanel({
  cat,
  view,
  panelRef,
  onSaved,
}: {
  cat: ReturnType<typeof useCatSetup>;
  view: RoomView;
  panelRef: RefObject<HTMLDivElement>;
  onSaved: () => void;
}) {
  const { draft, setDraft, saving: savingSetup, error: setupErr } = cat;
  if (!draft) return null;
  return (
    <div
      className={`${s.panel} ${editor.panel}`}
      role="region"
      id="setup-panel"
      ref={panelRef}
      tabIndex={-1}
      aria-label="Edit notes, cat appearance, and room"
    >
      <h2 className={editor.title}>Notes, cat & room</h2>
      <label className={s.fieldLabel} htmlFor="setup-name">
        Her name
      </label>

      <input
        id="setup-name"
        className={s.input}
        value={draft.name}
        maxLength={24}
        placeholder="her name"
        onChange={(e) => setDraft((d) => ({ ...d!, name: e.target.value }))}
      />

      <p id="setup-fur" className={s.fieldLabel}>
        Fur
      </p>
      <div className={s.swatchRow} role="group" aria-labelledby="setup-fur">
        {LOOKS.map((l) => (
          <button
            type="button"
            key={l.id}
            title={l.label}
            aria-label={l.label}
            aria-pressed={draft.look === l.id}
            onClick={() => setDraft((d) => ({ ...d!, look: l.id }))}
            className={s.swatch}
            style={{
              // Selection must leave the keyboard focus outline visible.
              background: l.cat.fur,
              boxShadow:
                `inset 0 -7px 0 ${l.cat.furDk}, inset 0 7px 0 ${l.cat.belly}` +
                (draft.look === l.id ? ", 0 0 0 2.5px var(--honey)" : ""),
            }}
          />
        ))}
      </div>

      <p id="setup-eyes" className={s.fieldLabel}>
        Eyes
      </p>
      <div className={s.eyeRow} role="group" aria-labelledby="setup-eyes">
        {EYES.map((e) => (
          <button
            type="button"
            key={e.id}
            title={e.label}
            aria-label={e.label}
            aria-pressed={draft.eyes === e.id}
            onClick={() => setDraft((d) => ({ ...d!, eyes: e.id }))}
            className={s.swatch}
            style={{
              background: e.hex,
              boxShadow: draft.eyes === e.id ? "0 0 0 2.5px var(--honey)" : "none",
            }}
          />
        ))}
      </div>

      <RoomDecorPicker value={draft.decor} onChange={(decor) => setDraft((d) => ({ ...d!, decor }))} />
      <label htmlFor="setup-timezone" className={s.fieldLabel}>
        Her timezone
      </label>
      <Select
        id="setup-timezone"
        value={draft.tz}
        onChange={(e) => setDraft((d) => ({ ...d!, tz: e.target.value }))}
      >
        {timezones().map((z) => (
          <option key={z} value={z}>
            {z.replace(/_/g, " ")}
          </option>
        ))}
      </Select>

      <label htmlFor="setup-home-hour" className={s.fieldLabel}>
        Usually home around
      </label>
      <Select
        id="setup-home-hour"
        value={draft.homeHour}
        onChange={(e) => setDraft((d) => ({ ...d!, homeHour: Number(e.target.value) }))}
      >
        {Array.from({ length: 24 }, (_, h) => (
          <option key={h} value={h}>
            {h === 0 ? "midnight" : h < 12 ? `${h}am` : h === 12 ? "noon" : `${h - 12}pm`}
          </option>
        ))}
      </Select>

      <label htmlFor="setup-notes" className={s.fieldLabel}>
        Her notes, one per line
      </label>
      <textarea
        id="setup-notes"
        aria-describedby="setup-notes-help"
        className={s.sayInput}
        style={{ minHeight: 150 }}
        value={draft.notes}
        rows={8}
        placeholder="One a day, in your own words."
        onChange={(e) => setDraft((d) => ({ ...d!, notes: e.target.value }))}
      />
      <p id="setup-notes-help" className={s.small} style={{ marginTop: 6 }}>
        {(() => {
          const lines = draft.notes.split("\n").filter((l) => l.trim());
          const overLong = lines.filter((l) => l.trim().length > NOTE_MAX).length;
          return (
            <>
              {Math.min(lines.length, NOTES_KEPT)} notes.
              {lines.length > NOTES_KEPT
                ? ` The room keeps the first ${NOTES_KEPT}, so the last ${lines.length - NOTES_KEPT} will not be saved.`
                : ""}
              {overLong > 0
                ? ` ${overLong === 1 ? "One is" : `${overLong} are`} longer than ${NOTE_MAX} characters and will be cut.`
                : ""}{" "}
            </>
          );
        })()}
        She gets one a day and the last one stays. Leave this empty to use the ones it came with.
      </p>

      <details style={{ marginTop: 8 }}>
        <summary className={s.summary}>What makes a good one</summary>
        <div className={s.small} style={{ marginTop: 8, display: "grid", gap: 7 }}>
          <p className={s.small}>
            One small ordinary thing beats one big kind thing.{" "}
            <i>You fell asleep before the film ended again</i> lands harder than <i>you are wonderful</i>,
            because only you could have written the first one.
          </p>
          <p className={s.small}>Shapes that work:</p>
          <p className={s.small} style={{ paddingLeft: 12 }}>
            Something you noticed. <i>You hum when you are concentrating and you have no idea.</i>
          </p>
          <p className={s.small} style={{ paddingLeft: 12 }}>
            Something you have not said out loud. <i>I was nervous the whole first month.</i>
          </p>
          <p className={s.small} style={{ paddingLeft: 12 }}>
            Something with no point to it.{" "}
            <i>The bakery on the corner has moved. I am upset about it and I know you will be too.</i>
          </p>
          <p className={s.small}>
            Put the one you would find hardest to say near the end. She reaches it, and by then it has had a
            few weeks to be true.
          </p>
        </div>
      </details>

      {(() => {
        const first = draft.notes
          .split("\n")
          .map((l) => l.trim())
          .find(Boolean);
        if (!first) return null;
        return (
          <>
            <p className={s.fieldLabel} style={{ marginTop: 14 }}>
              day one, as she'll get it
            </p>
            <div className={s.note} style={{ margin: 0 }}>
              <p className={s.noteFrom}>{view.you ?? "You"} left you something</p>
              <p className={s.noteText}>{first.slice(0, NOTE_MAX)}</p>
              <p className={s.noteDay}>day 1</p>
            </div>
          </>
        );
      })()}

      {view.recoveryCode && (
        <>
          <p className={s.fieldLabel} style={{ marginTop: 14 }}>
            recovery code
          </p>
          <p className={s.small} style={{ marginBottom: 6 }}>
            Save this somewhere that is not this phone. It gets your side of the room back if you lose it, and
            so does signing in.
          </p>
          <RecoveryCode code={view.recoveryCode} />
        </>
      )}

      {setupErr && (
        <p role="alert" className={s.small} style={{ color: "var(--error)", marginTop: 12 }}>
          {setupErr}
        </p>
      )}

      <div className={editor.actions}>
        <button type="button" className={s.btn} onClick={cat.close} disabled={savingSetup}>
          Cancel
        </button>
        <button
          type="button"
          className={`${s.btn} ${s.btnGo}`}
          disabled={savingSetup}
          onClick={async () => {
            if (await cat.save()) {
              onSaved();
            }
          }}
        >
          {savingSetup ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
