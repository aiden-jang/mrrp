import s from "./App.module.css";

/*
 * The screens for a room that is ending, or has ended, kept apart from App so they can be rendered
 * on their own in a test. They hold no state and fetch nothing: every one of them is a function of
 * what the room said plus a couple of callbacks.
 *
 * What is worth guarding here is the copy and which branch it takes. Each of these has two versions,
 * and showing somebody the wrong one is the whole failure mode: telling her a room is gone when he
 * can still put it back, or offering her a seat that somebody else is in.
 */

const dayOf = (at: number) => new Date(at).toLocaleDateString(undefined, { month: "long", day: "numeric" });

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
  // No cat on this screen, on purpose. Every other empty state in the app draws her asleep and
  // promises to keep trying, because every other empty state is a bad connection. This one is an
  // answer, and drawing the cat here would be telling somebody she is still in there.
  //
  // Two versions. Whoever deleted the room can still put it back, so he gets the date it stops being
  // possible. She is not offered a way back because she does not have one, and dangling one in front
  // of her would be worse than the plain fact.
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
      {/* Two different sentences, because the seat being free is the thing that decides whether coming
          back means getting your year back or starting one. */}
      {undoUntil ? (
        <>
          <p className={s.small} style={{ marginTop: 12 }}>
            Your side is out of the room: the moods, the visits, the days. It is kept until {dayOf(undoUntil)}
            , so you can still put it back exactly as it was, as long as nobody else has taken the seat by
            then.
          </p>
          {/* Because he can see it. Leaving her to guess whether he knows is a worse thing to do than
              telling her, and it becomes a lie by omission the moment she finds out. */}
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
      {/* Offered only when there is a free seat to take. A button whose only outcome is the
          both-seats-are-taken screen is worse than no button. */}
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

/*
 * What he sees where "Nobody else is here yet" would be.
 *
 * The wrong sentence for a seat somebody has left, and the difference matters: sending the link on is
 * what closes her way back, so he has to be told before he does it, not after.
 */
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
