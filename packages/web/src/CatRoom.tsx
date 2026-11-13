import s from "./App.module.css";
import { BLANKET_KEYS, BLANKETS, type BlanketKey } from "./blanket.js";
import { MoodFace } from "./faces.js";
import { fadeNote, listOf } from "./fades.js";
import { FrameSheet } from "./FrameSheet.js";
import { TheirRecent, whenish } from "./RoomArrival.js";
import { MoodResponse } from "./RoomChrome.js";
import { moodTint } from "./roomTheme.js";
import { SayBox } from "./screens.js";
import type { RoomView, Visit } from "./types.js";
import { GIFTS, LINE_MAX, MOODS } from "./types.js";
import type { useRoomActions } from "./useRoomActions.js";
import type { useRoomHistory } from "./useRoomHistory.js";
import type { useSayBox } from "./useSayBox.js";

export function CatRoom({
  view,
  actions,
  history,
  sayBox,
  theirLive,
  now,
  nightChrome,
  panel,
}: {
  view: RoomView;
  actions: ReturnType<typeof useRoomActions>;
  history: ReturnType<typeof useRoomHistory>;
  sayBox: ReturnType<typeof useSayBox>;
  theirLive: Pick<Visit, "at" | "action">[];
  now: number;
  nightChrome: boolean;
  panel: string;
}) {
  const { drawing, hangUp, bedding, pickBlanket, giftWords, setGiftWords, leaveGift, tell } = actions;
  const herMarks = listOf([view.shelfDown && "the mug on the floor", view.box && "you in the box"]);
  const herFades = fadeNote(view, "her", now);
  return (
    <>
      <section className={s.actionSection} aria-label="How are you feeling?">
        <h2 className={s.actionHeading}>How are you feeling?</h2>
        <div className={s.moodRow}>
          {MOODS.map((m) => (
            <button
              key={m.id}
              aria-pressed={view.catMood === m.id}
              className={`${s.mood} ${s.moodChoice} ${view.catMood === m.id ? s.moodOn : ""}`}
              style={view.catMood === m.id ? undefined : { background: moodTint(m.id, nightChrome, panel) }}
              onClick={() => void tell(m.id)}
            >
              <span>
                <MoodFace mood={m.id} color="var(--ink)" size={14} />
                {m.label}
              </span>
            </button>
          ))}
        </div>
        {actions.pendingMood ? (
          <p className={s.moodResponse} role="status">
            Sharing your mood…
          </p>
        ) : (
          <MoodResponse mood={view.catMood} />
        )}
      </section>
      <section className={s.actionSection} aria-label="Notes and replies">
        {view.note && (
          <div className={s.note}>
            <p className={s.noteFrom}>
              {view.note.final ? `${view.them} left this out for you` : `${view.them} left you something`}
            </p>
            <p className={s.noteText}>{view.note.text}</p>
            {!view.note.final && <p className={s.noteDay}>day {view.note.day}</p>}
            {!sayBox.open && (
              <button
                className={`${s.btn} ${s.btnGo} ${s.noteReply}`}
                onClick={() => sayBox.start(view.note!.day - 1)}
              >
                Say something back
              </button>
            )}
          </div>
        )}

        {sayBox.open ? (
          <SayBox
            value={sayBox.text}
            max={LINE_MAX}
            answering={sayBox.replyTo !== null && view.note ? view.note.text : null}
            him={view.them ?? "him"}
            saving={sayBox.saving}
            canClear={!!view.herLine}
            clearing={sayBox.clearing}
            boxRef={sayBox.boxRef}
            onChange={sayBox.setText}
            onSave={() => void sayBox.say()}
            onNeverMind={sayBox.neverMind}
            onClearTap={() => void sayBox.clearTap()}
          />
        ) : view.herLine ? (
          /* Opens empty. Saving adds a line rather than replacing this one, and a prefilled box says the opposite. */
          <button className={s.yourLine} onClick={() => sayBox.start(null)}>
            <span className={s.yourLineLabel}>the last thing you said to him</span>
            <span className={s.yourLineText}>{view.herLine.text}</span>
          </button>
        ) : (
          <button className={s.quiet} onClick={() => sayBox.start(null)}>
            Leave {view.them ?? "him"} a line
          </button>
        )}

        {view.note && (
          <>
            <button
              ref={history.trigger}
              className={s.quiet}
              disabled={history.loading}
              onClick={() => void history.open()}
            >
              Everything he's written you
            </button>
            {history.panel}
          </>
        )}

        {theirLive.length > 0 ? (
          <TheirRecent subject={<b>{view.them}</b>} items={theirLive} />
        ) : view.themHereNow ? null : view.themLastAt ? (
          <p className={s.came}>
            <b>{view.them}</b> looked in {whenish(view.themLastAt)}.
          </p>
        ) : null}

        {view.theyCameAfter && !view.themHereNow && <p className={s.came}>He came in after you said that.</p>}
      </section>

      <section className={s.actionSection} aria-label="Leave him something" id="cat-gift" tabIndex={-1}>
        <h2 className={s.actionHeading}>Leave him something</h2>
        <input
          value={giftWords}
          maxLength={LINE_MAX}
          placeholder="say something with it, if you want"
          onChange={(e) => setGiftWords(e.target.value)}
          className={s.giftWords}
          aria-label="Something to say with the thing you leave him"
        />
        <div className={s.moodRow}>
          {GIFTS.map((g) => (
            <button
              key={g.id}
              disabled={actions.gifting}
              aria-pressed={view.gift === g.id}
              className={`${s.mood} ${view.gift === g.id ? s.moodOn : ""}`}
              style={{ justifyContent: "center", padding: "9px 8px" }}
              onClick={() => void leaveGift(g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>
      </section>

      <section className={s.roomTools} aria-label="Room details">
        {herMarks && <p className={s.small}>He'll find {herMarks}.</p>}
        {herFades && <p className={s.fades}>{herFades}</p>}
        <FrameSheet
          current={view.doodle}
          saving={drawing}
          onSave={hangUp}
          onEditingChange={actions.setDrawingOpen}
        />
        <BlanketRow current={view.blanket} busy={bedding} onPick={(k, st) => void pickBlanket(k, st)} />
      </section>
    </>
  );
}

function BlanketRow({
  current,
  busy,
  onPick,
}: {
  current: RoomView["blanket"];
  busy: boolean;
  onPick: (key: BlanketKey, stripe: boolean) => void;
}) {
  const key = current?.key ?? "rose";
  const stripe = current?.stripe ?? false;
  return (
    <div className={s.blanketRow}>
      <p className={s.blanketLabel}>your blanket</p>
      <div className={s.blanketSwatches}>
        {BLANKET_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            className={s.blanketSwatch}
            aria-label={k}
            aria-pressed={k === key}
            disabled={busy}
            style={{
              background: BLANKETS[k].b,
              borderColor: k === key ? "var(--ink)" : BLANKETS[k].d,
            }}
            onClick={() => onPick(k, stripe)}
          />
        ))}
        <button
          type="button"
          className={s.blanketStripe}
          aria-label="stripes"
          aria-pressed={stripe}
          disabled={busy}
          style={{ borderColor: stripe ? "var(--ink)" : "var(--control)" }}
          onClick={() => onPick(key, !stripe)}
        >
          <span style={{ background: BLANKETS[key].d }} />
          <span style={{ background: BLANKETS[key].d }} />
        </button>
      </div>
    </div>
  );
}
