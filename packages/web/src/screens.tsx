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
