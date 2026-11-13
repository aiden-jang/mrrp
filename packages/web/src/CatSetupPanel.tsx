import { useState, type RefObject } from "react";
import s from "./App.module.css";
import editor from "./CatSetupPanel.module.css";
import { EYES, LOOKS, timezones } from "./looks.js";
import { Select } from "./RoomControls.js";
import { RoomDecorPicker } from "./RoomDecorPicker.js";
import type { useCatSetup } from "./useCatSetup.js";

export function CatSetupPanel({
  cat,
  panelRef,
  onSaved,
}: {
  cat: ReturnType<typeof useCatSetup>;
  panelRef: RefObject<HTMLDivElement>;
  onSaved: () => void;
}) {
  const { draft, setDraft, saving: savingSetup, error: setupErr } = cat;
  const [section, setSection] = useState("cat");
  if (!draft) return null;
  return (
    <div
      className={editor.panel}
      role="region"
      id="setup-panel"
      ref={panelRef}
      tabIndex={-1}
      aria-label="Edit cat appearance and room"
    >
      <h2 className={editor.title}>Cat & room</h2>
      <p className={s.small}>Preview her look in the room. Save to keep your changes.</p>
      <div className={editor.tabs} role="group" aria-label="Customize">
        {[
          ["cat", "The cat"],
          ["room", "The room"],
          ["day", "Her day"],
        ].map(([key, label]) => (
          <button
            type="button"
            key={key}
            className={s.quiet}
            aria-pressed={section === key}
            onClick={() => setSection(key!)}
          >
            {label}
          </button>
        ))}
      </div>
      {section === "cat" && (
        <fieldset className={editor.section} disabled={savingSetup}>
          <legend>The cat</legend>
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
        </fieldset>
      )}
      {section === "room" && (
        <RoomDecorPicker
          value={draft.decor}
          disabled={savingSetup}
          onChange={(decor) => setDraft((d) => ({ ...d!, decor }))}
        />
      )}
      {section === "day" && (
        <fieldset className={editor.section} disabled={savingSetup}>
          <legend>Her day</legend>
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
        </fieldset>
      )}
      <div className={editor.actions}>
        {setupErr && (
          <p role="alert" className={`${s.fieldError} ${editor.saveError}`}>
            {setupErr}
          </p>
        )}
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
