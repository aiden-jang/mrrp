import s from "./App.module.css";
import d from "./RoomActionDock.module.css";
import type { Action, RoomView } from "./types.js";
import { ACTIONS, CAT_ACTS } from "./types.js";
import type { useRoomActions } from "./useRoomActions.js";

export function RoomActionDock({
  view,
  actions,
  did,
}: {
  view: RoomView;
  actions: ReturnType<typeof useRoomActions>;
  did: string | null;
}) {
  const { strokes, setStrokes, photoOver, setPhotoOver, sitWith, act, waitAtDoor, settleIn, catAct } =
    actions;
  return (
    <section className={d.dock} aria-label={view.youAreHer ? "Be a cat about it" : "Keep her company"}>
      <div className={d.actions}>
        {view.youAreHer ? (
          <>
            <button
              className={`${s.btn} ${s.btnGo}`}
              aria-pressed={view.sittingWithYou ? view.settled : view.waitingAtDoor}
              onClick={() =>
                void (view.sittingWithYou ? settleIn(!view.settled) : waitAtDoor(!view.waitingAtDoor))
              }
            >
              <ActionMark kind="door" />
              <span>
                {view.sittingWithYou
                  ? view.settled
                    ? "Settled"
                    : "Settle into it"
                  : view.waitingAtDoor
                    ? "Come away from the door"
                    : "Wait by the door"}
              </span>
            </button>
            {CAT_ACTS.filter((a) => a.id !== "gift").map((a) => {
              const noBox = a.id === "box" && !view.boxOut;
              const done = a.id === "shelf" ? view.shelfDown : view.box;
              return (
                <button
                  key={a.id}
                  className={`${s.btn} ${done ? s.btnOn : ""}`}
                  aria-pressed={done}
                  disabled={noBox}
                  onClick={() => void catAct(a.id)}
                >
                  <ActionMark kind={a.id} />
                  <span>
                    {noBox
                      ? "No box out"
                      : a.id === "box" && view.box
                        ? "Get out of the box"
                        : a.id === "shelf"
                          ? "Knock the mug"
                          : a.label}
                  </span>
                </button>
              );
            })}
            <a href="#cat-gift" className={s.btn}>
              <ActionMark kind="gift" />
              <span>Leave him something</span>
            </a>
          </>
        ) : (
          ACTIONS.map((a) => {
            const brushing = a.id === "brush" && strokes !== null;
            const overDrawing = a.id === "photo" && !!view.doodle;
            const sitting = a.id === "sit" && view.sittingWith;
            const on = a.id === "sit" ? sitting : brushing || (MARKS[a.id]?.(view) ?? false);
            return (
              <button
                key={a.id}
                aria-pressed={on}
                className={`${s.btn} ${a.id === "sit" ? s.btnGo : ""} ${on ? s.btnOn : ""} ${sitting || brushing ? s.btnStaying : ""}`}
                onClick={() => {
                  if (a.id === "sit") return void sitWith(!view.sittingWith);
                  if (a.id === "brush") return setStrokes(brushing ? null : 0);
                  if (overDrawing && !photoOver) return setPhotoOver(true);
                  setPhotoOver(false);
                  void act(a.id);
                }}
              >
                <ActionMark kind={a.id} />
                <span>
                  {sitting
                    ? "Get up"
                    : brushing
                      ? `Brushing${".".repeat(strokes)}`
                      : overDrawing && photoOver
                        ? "That takes her drawing down"
                        : a.label}
                </span>
              </button>
            );
          })
        )}
      </div>
      {strokes !== null && !view.youAreHer && (
        <p className={s.hint} aria-live="polite">
          Brush her: drag across {view.cat.name}, back and forth.
        </p>
      )}
      {!view.youAreHer && (
        <p className={s.did} style={{ opacity: did && did !== "saved" ? 1 : 0 }} aria-live="polite">
          {did && did !== "saved" ? `She'll see that you ${did}.` : "\u00a0"}
        </p>
      )}
    </section>
  );
}

const MARKS: Partial<Record<Action, (v: RoomView) => boolean>> = {
  brush: (v) => v.brushed,
  photo: (v) => v.framed,
};

function ActionMark({ kind }: { kind: string }) {
  const paths: Record<string, string> = {
    sit: "M4 8V4h8v4M2 7h3v4h6V7h3v6H2V7Zm1 6v2m10-2v2",
    pet: "M5 8V3m3 4V1m3 7V3m3 6V6M2 8l3 5 3 2h4l3-4V8",
    brush: "m3 11 6-6 3 3-6 6H3v-3Zm5-7 3-3 4 4-3 3M10 2l4 4",
    photo: "M1 5h4l1-2h4l1 2h4v9H1V5Zm4 4h6v3H5V9Z",
    door: "M4 15V1h8v14M2 15h12M9 8h1",
    shelf: "M1 11h14M3 11v3m10-3v3M5 3h5v6H5V3Zm5 1h3v4h-3",
    box: "m1 5 7-3 7 3v8l-7 3-7-3V5Zm0 0 7 3 7-3M8 8v8",
    gift: "M8 14V5M8 9 3 6V3h3l2 3 2-3h3v3L8 9Z",
  };
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 16 17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="square"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[kind]} />
    </svg>
  );
}
