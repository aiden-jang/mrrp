import type { RefObject } from "react";
import s from "./App.module.css";
import { fadeNote, listOf } from "./fades.js";
import { FrameSheet } from "./FrameSheet.js";
import { TheirRecent, whenish } from "./RoomArrival.js";
import type { Action, RoomView, Visit } from "./types.js";
import { ACTIONS, MOODS, TREATS } from "./types.js";
import type { useCatSetup } from "./useCatSetup.js";
import type { useRoomActions } from "./useRoomActions.js";
import type { useRoomHistory } from "./useRoomHistory.js";

export function CompanionRoom({
  view,
  actions,
  history,
  cat,
  setupTrigger,
  theirLive,
  now,
  did,
}: {
  view: RoomView;
  actions: ReturnType<typeof useRoomActions>;
  history: ReturnType<typeof useRoomHistory>;
  cat: ReturnType<typeof useCatSetup>;
  setupTrigger: RefObject<HTMLButtonElement>;
  theirLive: Visit[];
  now: number;
  did: string | null;
}) {
  const setup = cat.open;
  const { strokes, setStrokes, photoOver, setPhotoOver, sitWith, act, boxOut, leaveOut, drawing, hangUp } =
    actions;
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
      {
        <div className={s.theirs}>
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
          <p className={s.small} style={{ marginTop: 8 }}>
            {view.forHer
              ? `${TREATS.find((t) => t.id === view.forHer)?.label ?? "Something"} is out, waiting for her.`
              : "Leave something out for her"}
          </p>
          <div className={s.moodRow}>
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

          <TheirRecent subject="She" items={theirLive} />
          <p className={s.small} style={{ marginTop: 4 }}>
            Go and be in there. That's all it takes.
          </p>
        </div>
      }

      {view.herLine && (
        <div className={s.note}>
          <p className={s.noteFrom}>{view.them} left you this</p>
          <p className={s.noteText}>{view.herLine.text}</p>
          <p className={s.noteDay}>{whenish(view.herLine.at)}</p>
        </div>
      )}

      {
        <>
          <button ref={history.trigger} className={s.quiet} onClick={() => void history.open()}>
            Everything the two of you have said
          </button>
          {history.panel}
        </>
      }

      {
        <>
          <div className={s.row} style={{ marginTop: 14 }}>
            {ACTIONS.map((a) => {
              const brushingNow = a.id === "brush" && strokes !== null;
              // The frame holds one thing, so a photo takes down whatever is drawn in it. Ask
              // first: he cannot see that his button is about to delete her drawing.
              const overDrawing = a.id === "photo" && !!view.doodle;
              const sitting = a.id === "sit" && view.sittingWith;
              // Sitting shows where he is, never where he has been. Dimming the button once he stands up would say
              // he had used it up.
              const on = a.id === "sit" ? sitting : brushingNow || (HIS_MARKS[a.id]?.(view) ?? false);
              return (
                <button
                  key={a.id}
                  aria-pressed={on}
                  className={`${s.btn} ${on ? s.btnOn : ""} ${sitting || brushingNow ? s.btnStaying : ""}`}
                  onClick={() => {
                    if (a.id === "sit") return void sitWith(!view.sittingWith);
                    if (a.id === "brush") return setStrokes(brushingNow ? null : 0);
                    if (overDrawing && !photoOver) return setPhotoOver(true);
                    setPhotoOver(false);
                    void act(a.id);
                  }}
                >
                  {sitting
                    ? "Get up"
                    : brushingNow
                      ? `Brushing${".".repeat(strokes)}`
                      : overDrawing && photoOver
                        ? "That takes her drawing down"
                        : a.label}
                </button>
              );
            })}
          </div>
          {strokes !== null && (
            <p className={s.hint} style={{ marginTop: 6 }} aria-live="polite">
              Brush her: drag across {view.cat.name}, back and forth.
            </p>
          )}
          {hisMarks && (
            <p className={s.small} style={{ marginTop: 6 }}>
              She'll find {hisMarks}.
            </p>
          )}
          {hisFades && <p className={s.fades}>{hisFades}</p>}
        </>
      }

      {
        <p className={s.did} style={{ opacity: did && did !== "saved" ? 1 : 0 }} aria-live="polite">
          {did && did !== "saved" ? `She'll see that you ${did}.` : "\u00a0"}
        </p>
      }

      <FrameSheet current={view.doodle} saving={drawing} onSave={hangUp} />

      {view.noteDay && (
        <p className={s.small} style={{ textAlign: "center" }}>
          She has note {view.noteDay} waiting. Hold on {view.cat.name} to pet her.
        </p>
      )}
      {view.sheHasReadAll && (
        <p className={s.small} style={{ textAlign: "center" }}>
          She has read all {view.notesInAll} of them. The box below takes more whenever you have some.
        </p>
      )}
      {!setup && (
        <button
          ref={setupTrigger}
          className={s.quiet}
          disabled={cat.loading}
          onClick={() => void cat.start()}
        >
          Write her notes, or change the cat and room
        </button>
      )}
    </>
  );
}

const HIS_MARKS: Partial<Record<Action, (v: RoomView) => boolean>> = {
  brush: (v) => v.brushed,
  sit: (v) => v.satWith,
  photo: (v) => v.framed,
};
