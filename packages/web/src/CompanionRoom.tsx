import type { RefObject } from "react";
import s from "./App.module.css";
import { fadeNote, listOf } from "./fades.js";
import { FrameSheet } from "./FrameSheet.js";
import { TheirRecent, whenish } from "./RoomArrival.js";
import type { RoomView, Visit } from "./types.js";
import { MOODS, TREATS } from "./types.js";
import type { useCatSetup } from "./useCatSetup.js";
import type { useRoomNotes } from "./useRoomNotes.js";
import type { useRoomActions } from "./useRoomActions.js";
import type { useRoomHistory } from "./useRoomHistory.js";

export function CompanionRoom({
  view,
  actions,
  history,
  cat,
  setupTrigger,
  notes,
  notesTrigger,
  theirLive,
  now,
}: {
  view: RoomView;
  actions: ReturnType<typeof useRoomActions>;
  history: ReturnType<typeof useRoomHistory>;
  cat: ReturnType<typeof useCatSetup>;
  setupTrigger: RefObject<HTMLButtonElement>;
  notes: ReturnType<typeof useRoomNotes>;
  notesTrigger: RefObject<HTMLButtonElement>;
  theirLive: Pick<Visit, "at" | "action">[];
  now: number;
}) {
  const setup = cat.open;
  const { boxOut, leaveOut, drawing, hangUp } = actions;
  const hisMarks = listOf([
    view.brushed && "a tuft of her on the rug",
    view.satWith && "the dent beside her bed",
    view.framed && "the picture on the wall",
    view.forHer && (TREATS.find((t) => t.id === view.forHer)?.label ?? null),
    view.boxOut && "a box",
  ]);
  const hisFades = fadeNote(view, "him", now);
  return (
    <>
      <section className={s.actionSection} aria-label="How she’s doing">
        <p className={s.theirsMain}>
          {view.catMood ? (
            <>
              <b>{view.them}</b> is {MOODS.find((m) => m.id === view.catMood)?.said}
              {view.catMoodAt ? `, ${whenish(view.catMoodAt)}` : ""}.
            </>
          ) : (
            <>
              <b>{view.them}</b> hasn't said how she is yet today.
            </>
          )}
        </p>

        {view.herLine && (
          <div className={s.note}>
            <p className={s.noteFrom}>{view.them} left you this</p>
            <p className={s.noteText}>{view.herLine.text}</p>
            <p className={s.noteDay}>{whenish(view.herLine.at)}</p>
          </div>
        )}

        {hisMarks && (
          <p className={s.small} style={{ marginTop: 6 }}>
            She'll find {hisMarks}.
          </p>
        )}
        {hisFades && <p className={s.fades}>{hisFades}</p>}

        <div className={s.note}>
          <h2 className={s.noteFrom}>Her notes</h2>
          {view.noteDay && !view.sheHasReadAll && <p className={s.small}>She’s on note {view.noteDay}.</p>}
          {view.sheHasReadAll && (
            <p className={s.small}>
              {view.notesInAll === 1
                ? "She has read your note."
                : `She has read all ${view.notesInAll} of them.`}{" "}
              You can leave more whenever you like.
            </p>
          )}
          {!setup && (
            <button
              ref={notesTrigger}
              className={`${s.btn} ${s.btnGo}`}
              disabled={notes.loading}
              onClick={() => void notes.start()}
            >
              {notes.loading ? "Opening her notes…" : "Write her notes"}
            </button>
          )}
        </div>

        <TheirRecent subject="She" items={theirLive} />
      </section>

      <section className={s.actionSection} aria-label="Leave something out">
        <h2 className={s.actionHeading}>Leave something out</h2>
        <p className={s.small} style={{ marginBottom: 8 }}>
          {view.forHer
            ? `${TREATS.find((t) => t.id === view.forHer)?.label ?? "Something"} is out, waiting for her.`
            : "She’ll find it when she comes in."}
        </p>
        <div className={s.row}>
          <button
            aria-pressed={view.boxOut}
            disabled={view.box}
            className={`${s.mood} ${view.boxOut ? s.moodOn : ""}`}
            style={{
              justifyContent: "center",
              padding: "9px 8px",
              opacity: view.box ? 0.55 : undefined,
            }}
            onClick={() => void boxOut(!view.boxOut)}
          >
            {view.box ? "she's in it" : view.boxOut ? "a box is out" : "a box"}
          </button>
          {TREATS.map((t) => (
            <button
              key={t.id}
              aria-pressed={view.forHer === t.id}
              className={`${s.mood} ${view.forHer === t.id ? s.moodOn : ""}`}
              style={{ justifyContent: "center", padding: "9px 8px" }}
              onClick={() => void leaveOut(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className={s.roomTools} aria-label="Notes and room details">
        <button
          ref={history.trigger}
          className={s.quiet}
          disabled={history.loading}
          onClick={() => void history.open()}
        >
          Everything the two of you have said
        </button>
        {history.panel}

        <FrameSheet
          current={view.doodle}
          saving={drawing}
          onSave={hangUp}
          onEditingChange={actions.setDrawingOpen}
        />
        <button ref={setupTrigger} className={s.quiet} disabled={notes.loading} onClick={cat.start}>
          Change the cat and room
        </button>
      </section>
    </>
  );
}
