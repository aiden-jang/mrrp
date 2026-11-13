import { logoutUrl } from "@aidenjang/auth-client";
import { useEffect, useRef, useState } from "react";
import { doRelease, myToken, whoAmI, type SignedInAs } from "./api.js";
import s from "./App.module.css";
import { AUTH_URL } from "./config.js";
import { RecoveryCode } from "./RoomControls.js";
import type { RoomView } from "./types.js";
import type { useOurDay } from "./useOurDay.js";
import type { useRoomEnding } from "./useRoomEnding.js";
import type { SeatAccount } from "./useSeatAccount.js";
import type { useRoomSharing } from "./useRoomSharing.js";
import { InviteLinkFallback } from "./InviteLinkFallback.js";
import { RoomAccess } from "./RoomAccess.js";

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
  shareResult: ReturnType<typeof useRoomSharing>["shareResult"];
  onShare: () => void;
  reload: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const iAmHim = view.you !== null && !view.youAreHer;
  const [releasing, setReleasing] = useState(false);
  const [freeing, setFreeing] = useState(false);
  const releasePending = useRef(false);
  const [me, setMe] = useState<SignedInAs | null>(null);
  useEffect(() => {
    let active = true;
    void whoAmI().then((result) => {
      if (active) setMe(result);
    });
    return () => {
      active = false;
    };
  }, []);
  const { linking, linkError: linkErr, link } = account;
  const { typedName, setTypedName, ending, armed: leaveArmed, setArmed: setLeaveArmed } = exit;
  return (
    <details className={s.roomBits} id="room-account">
      <summary className={s.roomBitsTitle}>Room & account</summary>
      {view.recoveryCode && (
        <section className={s.accountSection} aria-label="Keep your seat">
          <h2>Keep your seat</h2>
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
              disabled={linking || me === null}
              onClick={() => void link(!view.linked)}
            >
              {linking
                ? "Updating your seat…"
                : view.linked
                  ? "Take this seat off my account"
                  : me?.signedIn
                    ? "Keep this seat on my account"
                    : "Sign in to keep this seat"}
            </button>
            <p className={`${s.small} ${s.whoRow}`}>
              {me === null ? (
                "Checking your account…"
              ) : me.unavailable ? (
                "Couldn’t check your account. You can still use the room."
              ) : me.signedIn ? (
                <>
                  Signed in{me.name ? ` as ${me.name}` : ""}.{" "}
                  <a className={s.creditLink} href={logoutUrl(AUTH_URL, window.location.href)}>
                    Sign out
                  </a>
                </>
              ) : (
                <>You can use the room without signing in.</>
              )}
            </p>
            {linkErr && (
              <p className={s.small} style={{ marginTop: 8, color: "var(--error)" }} role="status">
                {linkErr}
              </p>
            )}
          </div>
          <details className={s.recovery}>
            <summary className={s.recoverySummary}>Use a recovery code</summary>
            <p className={s.small} style={{ marginTop: 8 }}>
              For getting back in without an account. Keep it somewhere that is not this phone.
            </p>
            <RecoveryCode code={view.recoveryCode} />
          </details>
        </section>
      )}
      <section className={s.accountSection} aria-label="A day worth remembering">
        <details>
          <summary className={s.summary}>a day worth remembering</summary>
          <div style={{ marginTop: 8 }}>
            <label className={s.fieldLabel} htmlFor="room-day">
              The date
            </label>
            <input
              id="room-day"
              className={`${s.input} ${s.dateInput}`}
              type="date"
              value={ourDay.date}
              min="1900-01-01"
              max="2100-12-31"
              aria-label="The date"
              name="room-day"
              onChange={(e) => ourDay.setDate(e.target.value)}
            />
            <label className={s.fieldLabel} htmlFor="room-day-label" style={{ marginTop: 12 }}>
              What the day is
            </label>
            <input
              id="room-day-label"
              className={s.input}
              value={ourDay.label}
              maxLength={32}
              placeholder="what it is, in a few words"
              aria-label="What the day is"
              name="room-day-label"
              onChange={(e) => ourDay.setLabel(e.target.value)}
            />
            <p className={s.small} style={{ marginTop: 6 }}>
              {view.cat.name} says it every year on the day, to both of you, in exactly those words.{" "}
              {view.them ?? "They"} will not see it here, so it stays a surprise. Leave either blank for no
              day at all.
            </p>
            <button
              className={s.btn}
              style={{ width: "100%", marginTop: 8 }}
              disabled={ourDay.saving}
              onClick={() => void ourDay.save()}
            >
              {ourDay.saving ? "Keeping…" : ourDay.saved ? "Kept" : "Keep this day"}
            </button>
          </div>
        </details>
      </section>
      <section className={s.accountSection} aria-label="Room access">
        <h2>Room access</h2>
        {view.recoveryCode && <RoomAccess id={id} reload={reload} />}
        {iAmHim && !view.waitingForThem && (
          <button className={s.quiet} disabled={shareResult === "sharing"} onClick={() => onShare()}>
            {shareResult === "sharing"
              ? "Opening sharing…"
              : shareResult === "failed"
                ? "Try sharing again"
                : shareResult === "shared"
                  ? "Sent."
                  : shareResult === "copied"
                    ? "Copied. Go send it."
                    : `Send ${view.them ?? "her"} the link again`}
          </button>
        )}
        {iAmHim && !view.waitingForThem && shareResult === "failed" && <InviteLinkFallback />}
        {iAmHim &&
          !view.waitingForThem &&
          (releasing ? (
            <div className={s.panel} style={{ marginTop: 14 }}>
              <p className={s.small} style={{ color: "var(--ink)" }}>
                Free her seat so she can return on another browser. Whoever opens the room link next becomes
                the cat, so send it directly to her afterwards. Her notes and reply stay here.
              </p>
              <div className={s.row} style={{ marginTop: 12 }}>
                <button className={s.btn} disabled={freeing} onClick={() => setReleasing(false)}>
                  Never mind
                </button>
                <button
                  className={`${s.btn} ${s.btnGo}`}
                  disabled={freeing}
                  onClick={async () => {
                    if (releasePending.current) return;
                    releasePending.current = true;
                    setFreeing(true);
                    try {
                      await doRelease(id);
                      setReleasing(false);
                      await reload();
                    } catch (e) {
                      onError(e instanceof Error ? e.message : "Couldn't do that.");
                    } finally {
                      releasePending.current = false;
                      setFreeing(false);
                    }
                  }}
                >
                  {freeing ? "Freeing her seat…" : "Free her seat"}
                </button>
              </div>
            </div>
          ) : (
            <button className={s.quiet} onClick={() => setReleasing(true)}>
              {view.them ?? "She"} can&apos;t get in
            </button>
          ))}
      </section>
      <section className={s.accountSection} aria-label="Leaving the room">
        {(iAmHim || view.youAreHer) && (
          <details className={`${s.recovery} ${s.ending}`} onToggle={() => setLeaveArmed(false)}>
            <summary className={s.recoverySummary}>{iAmHim ? "delete this room" : "leave this room"}</summary>
            <p className={s.small} style={{ marginTop: 8 }}>
              <a
                className={s.creditLink}
                href={`/api/room/${id}/export?me=${encodeURIComponent(myToken(id))}`}
              >
                Take a copy first
              </a>
              , if you want to keep what is in here.
            </p>
            {iAmHim ? (
              <>
                <p className={s.small} style={{ marginTop: 8 }}>
                  This deletes the whole room for both of you: {view.cat.name}, the notes, everything either
                  of you left in here. It happens straight away. You have a week to change your mind, and
                  after that it is erased for good.
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
                  This takes your side out of the room: your moods, your visits, the days you have been in
                  here. {view.them ?? "The other one"} keeps the room and {view.cat.name} stays, but she will
                  not be you any more. You have a week to change your mind, unless the seat is taken before
                  then.
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
      </section>
    </details>
  );
}

export function RoomSettingsLink() {
  return (
    <a
      className={s.settingsLink}
      href="#room-account"
      onClick={(event) => {
        const panel = document.getElementById("room-account");
        if (!(panel instanceof HTMLDetailsElement)) return;
        event.preventDefault();
        panel.open = true;
        panel.querySelector("summary")?.focus();
        panel.scrollIntoView({ block: "start" });
      }}
    >
      Room & account
    </a>
  );
}
