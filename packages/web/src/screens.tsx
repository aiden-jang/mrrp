import type { SaidSoFar } from "./types.js";
import { GIFTS } from "./types.js";
import s from "./App.module.css";

const dayOf = (at: number) => new Date(at).toLocaleDateString(undefined, { month: "long", day: "numeric" });

// No cat on this screen. Every other empty state draws her asleep and promises to keep trying,
// because those are bad connections. This one is an answer.
export function GoneCard({
  undoUntil,
  undoing,
  err,
  onPutBack,
  onHome,
}: {
  undoUntil: number | null;
  undoing: boolean;
  err: string | null;
  onPutBack: () => void;
  onHome: () => void;
}) {
  if (undoUntil) {
    return (
      <div className={s.card} style={{ textAlign: "center" }}>
        <h1 className={s.h1}>you deleted this room</h1>
        <p className={s.small} style={{ marginTop: 12 }}>
          It is gone for both of you already. Nothing is erased until {dayOf(undoUntil)}, so if you did not
          mean it, you can still put it back exactly as it was.
        </p>
        <button
          className={`${s.btn} ${s.btnGo}`}
          style={{ width: "100%", marginTop: 18 }}
          disabled={undoing}
          onClick={onPutBack}
        >
          {undoing ? "putting it back…" : "Put the room back"}
        </button>
        {err && (
          <p className={s.small} style={{ marginTop: 10, color: "var(--error)" }} role="status">
            {err}
          </p>
        )}
        <button className={s.quiet} onClick={onHome}>
          No, I meant it
        </button>
      </div>
    );
  }

  return (
    <div className={s.card} style={{ textAlign: "center" }}>
      <h1 className={s.h1}>this room is gone</h1>
      <p className={s.small} style={{ marginTop: 12 }}>
        It was deleted. The cat, the notes, the year of it, both sides. There is nothing left in here to get
        back.
      </p>
      <button className={`${s.btn} ${s.btnGo}`} style={{ width: "100%", marginTop: 18 }} onClick={onHome}>
        Start a new one
      </button>
    </div>
  );
}

export function LeftCard({
  catName,
  undoUntil,
  theyWereTold,
  seatFree,
  undoing,
  err,
  onPutBack,
  onStartFresh,
}: {
  catName: string;
  undoUntil: number | null;
  theyWereTold: string | null;
  seatFree: boolean;
  undoing: boolean;
  err: string | null;
  onPutBack: () => void;
  onStartFresh: () => void;
}) {
  return (
    <div className={s.card} style={{ textAlign: "center" }}>
      <h1 className={s.h1}>you left this room</h1>
      {undoUntil ? (
        <>
          <p className={s.small} style={{ marginTop: 12 }}>
            Your side is out of the room: the moods, the visits, the days. It is kept until {dayOf(undoUntil)}
            , so you can still put it back exactly as it was, as long as nobody else has taken the seat by
            then.
          </p>
          {theyWereTold && (
            <p className={s.small} style={{ marginTop: 10 }}>
              {theyWereTold} has been told the same thing: that you left, and until when you can put it back.
            </p>
          )}
          <button
            className={`${s.btn} ${s.btnGo}`}
            style={{ width: "100%", marginTop: 18 }}
            disabled={undoing}
            onClick={onPutBack}
          >
            {undoing ? "putting it back…" : "Put my side back"}
          </button>
          {err && (
            <p className={s.small} style={{ marginTop: 10, color: "var(--error)" }} role="status">
              {err}
            </p>
          )}
        </>
      ) : (
        <p className={s.small} style={{ marginTop: 12 }}>
          Your side of it is gone: the moods, the visits, the days.{" "}
          {seatFree
            ? `${catName} is still in there and the seat is empty, so you can take it again. You would be starting from the beginning.`
            : "Somebody else is the cat now, so there is no seat to come back to."}
        </p>
      )}
      {(undoUntil || seatFree) && (
        <button
          className={undoUntil ? s.quiet : `${s.btn} ${s.btnGo}`}
          style={undoUntil ? undefined : { width: "100%", marginTop: 18 }}
          onClick={onStartFresh}
        >
          {undoUntil ? "No, start fresh instead" : "Take the seat again"}
        </button>
      )}
    </div>
  );
}

export function TheyLeftNotice({ name, until }: { name: string; until: number }) {
  return (
    <>
      <p className={s.newsMain}>{name} left this room.</p>
      <p className={s.small} style={{ textAlign: "center" }}>
        Her side of it is kept until {dayOf(until)}, so she can put it back if she changes her mind. Sending
        this link to somebody else gives the seat away, and that ends it.
      </p>
    </>
  );
}

/*
 * Notes carry no timestamp and her lines do, so the two cannot be ordered into one list. Her answers
 * hang off the notes they answer, which is the only real link between them.
 */
export function SaidPanel({
  said,
  youAreHer,
  them,
  onClose,
  panelRef,
}: {
  said: SaidSoFar;
  youAreHer: boolean;
  them: string;
  onClose: () => void;
  panelRef?: React.Ref<HTMLElement>;
}) {
  // Don't print his name on her side: it is a placeholder until he picks one. Don't say "wrote" on
  // his: this stops at the note she has been handed, and he may have written a hundred more.
  const wrote = youAreHer ? "what he's written you" : "what she has read so far";
  const back = youAreHer ? "you said back" : `${them} said back`;

  return (
    <section
      ref={panelRef}
      className={s.panel}
      aria-label="Everything the two of you have said"
      tabIndex={-1}
    >
      <div className={s.saidTop}>
        <p className={s.panelTitle}>{wrote}</p>
        <button type="button" onClick={onClose} className={s.arrivalClose} aria-label="Close">
          ×
        </button>
      </div>

      <ol className={s.saidList}>
        {said.notes.map((note) => (
          <li key={note.day} className={s.saidNote}>
            <p className={s.saidDay}>day {note.day}</p>
            <p className={s.saidText}>{note.text}</p>
            {note.answers.map((answer) => (
              <p key={answer.at} className={s.saidBack}>
                <span className={s.saidWho}>{back}</span>
                <span>&ldquo;{answer.text}&rdquo;</span>
                <small className={s.saidWhen}>{dayOf(answer.at)}</small>
              </p>
            ))}
          </li>
        ))}
      </ol>

      {said.lines.length > 0 && (
        <>
          <p className={s.fieldLabel}>
            {youAreHer ? "and the rest of what you said" : `and the rest of what ${them} said`}
          </p>
          <ul className={s.saidList}>
            {said.lines.map((line, i) => (
              <li key={line.at} className={s.saidLine}>
                {/* She answered this one, and he has since rewritten it. Show what she was
                    answering, or her words sit here looking like a reply to nothing. */}
                {line.about && <span className={s.saidWho}>answering &ldquo;{line.about}&rdquo;</span>}
                {line.gift && (
                  <span className={s.saidWho}>
                    with {GIFTS.find((g) => g.id === line.gift)?.label ?? "something"}
                  </span>
                )}
                <span>&ldquo;{line.text}&rdquo;</span>
                {dayOf(line.at) !== dayOf(said.lines[i - 1]?.at ?? 0) && (
                  <small className={s.saidWhen}>{dayOf(line.at)}</small>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/* Out here so a test can click it: an empty save clears every line she has ever left him. */
export function SayBox({
  value,
  max,
  answering,
  him,
  saving,
  canClear,
  clearing,
  onChange,
  onSave,
  onNeverMind,
  onClearTap,
  boxRef,
}: {
  value: string;
  max: number;
  answering: string | null;
  him: string;
  saving: boolean;
  canClear: boolean;
  clearing: boolean;
  onChange: (next: string) => void;
  onSave: () => void;
  onNeverMind: () => void;
  onClearTap: () => void;
  boxRef?: React.Ref<HTMLTextAreaElement>;
}) {
  return (
    <div className={s.sayBox}>
      {answering !== null && (
        <p className={s.answerMine} style={{ marginBottom: 6 }}>
          answering &ldquo;{answering}&rdquo;
        </p>
      )}
      <textarea
        autoFocus
        ref={boxRef}
        value={value}
        maxLength={max}
        placeholder={answering !== null ? "Say it back to him" : `Something for ${him} to find`}
        onChange={(e) => onChange(e.target.value)}
        className={s.sayInput}
        aria-label={answering !== null ? "Your answer" : "Something to leave him"}
      />
      {max - value.length <= 20 && (
        <p className={s.small} style={{ textAlign: "right", margin: "6px 2px 0" }}>
          {max - value.length} left
        </p>
      )}
      <div className={s.row} style={{ marginTop: 8 }}>
        <button className={s.btn} onClick={onNeverMind}>
          Never mind
        </button>
        <button className={`${s.btn} ${s.btnGo}`} disabled={saving || value.trim() === ""} onClick={onSave}>
          {saving ? "Leaving it..." : "Leave it"}
        </button>
      </div>
      {canClear && (
        <button className={s.quiet} onClick={onClearTap}>
          {clearing ? "Sure? All of it goes." : "Take back everything you've said"}
        </button>
      )}
    </div>
  );
}
