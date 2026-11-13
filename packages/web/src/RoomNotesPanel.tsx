import { useEffect, useRef, type RefObject } from "react";
import s from "./App.module.css";
import editor from "./CatSetupPanel.module.css";
import { NOTE_MAX, NOTES_KEPT, type RoomView } from "./types.js";
import type { useRoomNotes } from "./useRoomNotes.js";

export function RoomNotesPanel({
  notes,
  view,
  panelRef,
  onSaved,
}: {
  notes: ReturnType<typeof useRoomNotes>;
  view: RoomView;
  panelRef: RefObject<HTMLDivElement>;
  onSaved: () => void;
}) {
  const fields = useRef<(HTMLTextAreaElement | null)[]>([]);
  const added = useRef<number | null>(null);
  useEffect(() => {
    if (added.current === null) return;
    fields.current[added.current]?.focus();
    added.current = null;
  }, [notes.draft?.length]);
  if (!notes.draft) return null;
  const draft = notes.draft;
  const count = draft.filter((note) => note.trim()).length;
  return (
    <div
      ref={panelRef}
      id="notes-panel"
      role="region"
      aria-label={`Notes for ${view.cat.name}`}
      tabIndex={-1}
      className={editor.panel}
    >
      <div className={editor.heading}>
        <div>
          <h2 className={editor.title}>Notes for {view.cat.name}</h2>
          <p className={s.small}>One a day. The last one stays.</p>
        </div>
        <button
          type="button"
          className={s.btn}
          disabled={notes.saving || draft.length >= NOTES_KEPT}
          onClick={() => {
            added.current = draft.length;
            notes.setDraft([...draft, ""]);
          }}
        >
          Add a note
        </button>
      </div>
      <fieldset className={editor.noteList} disabled={notes.saving}>
        <legend className={s.srOnly}>Her notes</legend>
        {draft.map((note, index) => (
          <div className={editor.noteEdit} key={index}>
            <div className={editor.noteDayRow}>
              <label htmlFor={`room-note-${index}`}>Day {index + 1}</label>
              {view.noteDay && index < view.noteDay && (
                <span className={s.small}>Shared with {view.cat.name}</span>
              )}
            </div>
            <textarea
              ref={(element) => {
                fields.current[index] = element;
              }}
              id={`room-note-${index}`}
              className={s.sayInput}
              rows={3}
              value={note}
              maxLength={NOTE_MAX}
              aria-label={`Note for day ${index + 1}`}
              onChange={(e) =>
                notes.setDraft(draft.map((line, at) => (at === index ? e.target.value : line)))
              }
            />
            {NOTE_MAX - note.length <= 20 && (
              <p className={s.small}>{NOTE_MAX - note.length} characters left</p>
            )}
          </div>
        ))}
      </fieldset>
      <p className={s.small}>
        {count} {count === 1 ? "note" : "notes"}. Leave a note empty to remove it. An empty list restores the
        original notes.
      </p>
      <div className={editor.actions}>
        {notes.error && (
          <p className={`${s.fieldError} ${editor.saveError}`} role="alert">
            {notes.error}
          </p>
        )}
        <button type="button" className={s.btn} disabled={notes.saving} onClick={notes.close}>
          Cancel
        </button>
        <button
          type="button"
          className={`${s.btn} ${s.btnGo}`}
          disabled={notes.saving}
          onClick={async () => {
            if (await notes.save()) onSaved();
          }}
        >
          {notes.saving ? "Saving…" : "Save notes"}
        </button>
      </div>
    </div>
  );
}
