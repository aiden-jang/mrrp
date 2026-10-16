import { loginUrl, logoutUrl } from "@aidenjang/auth-client";
import { useEffect, useState } from "react";
import { doRelease, myToken, whoAmI, type SignedInAs } from "./api.js";
import s from "./App.module.css";
import { AUTH_URL } from "./config.js";
import { RecoveryCode } from "./RoomControls.js";
import type { RoomView } from "./types.js";
import type { useOurDay } from "./useOurDay.js";
import type { useRoomEnding } from "./useRoomEnding.js";
import type { SeatAccount } from "./useSeatAccount.js";

export function RoomSettings({
  id,
  view,
  account,
  exit,
  ourDay,
  shareResult,
  onShare,
  reload,
  onError,
}: {
  id: string;
  view: RoomView;
  account: SeatAccount;
  exit: ReturnType<typeof useRoomEnding>;
  ourDay: ReturnType<typeof useOurDay>;
  shareResult: "copied" | "shared" | null;
  onShare: () => void;
  reload: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const iAmHim = view.you !== null && !view.youAreHer;
  const [releasing, setReleasing] = useState(false);
  const [me, setMe] = useState<SignedInAs>({ signedIn: false, name: null });
  useEffect(() => {
    void whoAmI().then(setMe);
  }, []);
  const { linking, linkError: linkErr, link } = account;
  const { typedName, setTypedName, ending, armed: leaveArmed, setArmed: setLeaveArmed } = exit;
  return (
    <details className={s.roomBits}>
      <summary className={s.roomBitsTitle}>Room & account</summary>
      <details>
        <summary className={s.summary}>a day worth remembering</summary>
        <div style={{ marginTop: 8 }}>
          <input
            className={`${s.input} ${s.dateInput}`}
            type="date"
            value={ourDay.date}
            min="1900-01-01"
            max="2100-12-31"
            aria-label="The date"
            onChange={(e) => ourDay.setDate(e.target.value)}
          />
          <input
            className={s.input}
            style={{ marginTop: 8 }}
            value={ourDay.label}
            maxLength={32}
            placeholder="what it is, in a few words"
            aria-label="What the day is"
            onChange={(e) => ourDay.setLabel(e.target.value)}
          />
          <p className={s.small} style={{ marginTop: 6 }}>
            {view.cat.name} says it every year on the day, to both of you, in exactly those words.{" "}
            {view.them ?? "They"} will not see it here, so it stays a surprise. Leave either blank for no day
            at all.
          </p>
          <button
            className={s.btn}
            style={{ width: "100%", marginTop: 8 }}
            onClick={() => void ourDay.save()}
          >
            {ourDay.saved ? "Kept" : "Keep this day"}
          </button>
        </div>
      </details>
      {view.recoveryCode && (
        <div className={s.accountInBits}>
          <p className={s.small}>
            {view.linked
              ? "This seat is on your account, so signing in on a new phone brings you straight back here."
              : "Sign in and this seat comes back on any phone you sign in on. No code to keep."}{" "}
            <a
              href={`${AUTH_URL}/privacy`}
              target="_blank"
              aria-describedby="external-link-hint"
              rel="noopener noreferrer"
              className={s.creditLink}
            >
              What this keeps
            </a>
            .
          </p>
          <button
            className={`${s.btn} ${s.accountBtn}`}
            disabled={linking}
            onClick={() => void link(!view.linked)}
          >
            {view.linked ? "Take this seat off my account" : "Keep this seat on my account"}
          </button>
          <p className={`${s.small} ${s.whoRow}`}>
            {me.signedIn ? (
              <>
                Signed in{me.name ? ` as ${me.name}` : ""}.{" "}
                <a className={s.creditLink} href={logoutUrl(AUTH_URL, window.location.href)}>
                  Sign out
                </a>
              </>
            ) : (
              <>
                Not signed in.{" "}
                <a className={s.creditLink} href={loginUrl(AUTH_URL, window.location.href)}>
                  Sign in
                </a>
              </>
            )}
          </p>
          {linkErr && (
            <p className={s.small} style={{ marginTop: 8, color: "var(--error)" }} role="status">
              {linkErr}
            </p>
          )}
        </div>
      )}
      {view.recoveryCode && (
        <details className={s.recovery}>
          <summary className={s.recoverySummary}>or keep a code instead</summary>
          <p className={s.small} style={{ marginTop: 8 }}>
            For getting back in without an account. Keep it somewhere that is not this phone.
          </p>
          <RecoveryCode code={view.recoveryCode} />
        </details>
      )}
      {iAmHim && (
        <button className={s.quiet} onClick={() => onShare()}>
          {shareResult === "shared"
            ? "Sent."
            : shareResult === "copied"
              ? "Copied. Go send it."
              : `Send ${view.them ?? "her"} the link again`}
        </button>
      )}
      {iAmHim &&
        !view.waitingForThem &&
        (releasing ? (
          <div className={s.panel} style={{ marginTop: 14 }}>
            <p className={s.small} style={{ color: "var(--ink)" }}>
              Her seat lives in one browser, so a new phone, a cleared browser or a private window you opened
              to look at the room can all end up holding it. This frees it, and whoever opens the link next
              becomes the cat, so send it to her again afterwards. She keeps her place in the notes and the
              line she left you.
            </p>
            <div className={s.row} style={{ marginTop: 12 }}>
              <button className={s.btn} onClick={() => setReleasing(false)}>
                Never mind
              </button>
              <button
                className={`${s.btn} ${s.btnGo}`}
                onClick={async () => {
                  try {
                    await doRelease(id);
                    setReleasing(false);
                    await reload();
                  } catch (e) {
                    onError(e instanceof Error ? e.message : "Couldn't do that.");
                  }
                }}
              >
                Free her seat
              </button>
            </div>
          </div>
        ) : (
          <button className={s.quiet} onClick={() => setReleasing(true)}>
            {view.them ?? "She"} can&apos;t get in
          </button>
        ))}
      {(iAmHim || view.youAreHer) && (
        <details className={`${s.recovery} ${s.ending}`} onToggle={() => setLeaveArmed(false)}>
          <summary className={s.recoverySummary}>{iAmHim ? "delete this room" : "leave this room"}</summary>
          <p className={s.small} style={{ marginTop: 8 }}>
            <a className={s.creditLink} href={`/api/room/${id}/export?me=${encodeURIComponent(myToken())}`}>
              Take a copy first
            </a>
            , if you want to keep what is in here.
          </p>
          {iAmHim ? (
            <>
              <p className={s.small} style={{ marginTop: 8 }}>
                This deletes the whole room for both of you: {view.cat.name}, the notes, everything either of
                you left in here. It happens straight away. You have a week to change your mind, and after
                that it is erased for good.
              </p>
              {/* His name, not hers: she is the cat, so typing hers reads as erasing her. */}
              <p className={s.small} style={{ marginTop: 10 }}>
                Sign your own name to confirm.
              </p>
              <input
                className={s.input}
                value={typedName}
                placeholder={view.you ?? "your name"}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-label={`Type ${view.you ?? "your name"} to confirm deleting this room`}
                onChange={(e) => setTypedName(e.target.value)}
              />
              <button
                className={s.quiet}
                disabled={
                  ending || !view.you || typedName.trim().toLowerCase() !== view.you.trim().toLowerCase()
                }
                onClick={() => void exit.endRoom()}
              >
                {ending ? "deleting…" : "Delete this room for both of us"}
              </button>
            </>
          ) : (
            <>
              <p className={s.small} style={{ marginTop: 8 }}>
                This takes your side out of the room: your moods, your visits, the days you have been in here.{" "}
                {view.them ?? "The other one"} keeps the room and {view.cat.name} stays, but she will not be
                you any more. You have a week to change your mind, unless the seat is taken before then.
              </p>
              <button
                className={s.quiet}
                disabled={ending}
                onClick={() => (leaveArmed ? void exit.leave() : setLeaveArmed(true))}
              >
                {ending ? "leaving…" : leaveArmed ? "Yes, take my side out of it" : "Leave this room"}
              </button>
            </>
          )}
        </details>
      )}
    </details>
  );
}
