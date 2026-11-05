import type { ReactNode } from "react";
import type { Mood } from "./types.js";
import s from "./App.module.css";
import { PawMark } from "./screens.js";

export function RoomWordmark() {
  return (
    <div className={s.roomWordmark}>
      <span className={s.brand} translate="no">
        <PawMark />
        mrrp
      </span>
      <span>A room for two</span>
    </div>
  );
}

export function RoomHeader({
  name,
  presence,
  together,
  children,
}: {
  name: string;
  presence: string;
  together: boolean;
  children: ReactNode;
}) {
  return (
    <header>
      <RoomWordmark />
      <div className={s.roomHeader}>
        <h1 className={s.roomName}>{name}’s room</h1>
        <p className={s.roomPresence}>
          {together && <span className={s.presenceDot} aria-hidden="true" />}
          {presence}
        </p>
        {children}
      </div>
    </header>
  );
}

export function Invitation({ children, onEnter }: { children: ReactNode; onEnter: () => void }) {
  return (
    <div className={`${s.card} ${s.roomCard}`}>
      <RoomWordmark />
      <div className={s.invitation}>
        <div className={s.invitationCopy}>
          <h1 className={s.roomName}>You’re the cat.</h1>
          <p className={s.lede}>
            Somebody made you a room. Come in, tap how you feel, and let them keep you company.
          </p>
          <button className={`${s.btn} ${s.btnGo}`} onClick={onEnter}>
            Go in
          </button>
          <p className={s.small}>No account. No daily attendance. Naps encouraged.</p>
        </div>
        <div className={s.stage}>{children}</div>
      </div>
    </div>
  );
}

const replies: Record<Mood, string> = {
  good: "Excellent. Suspicious, but excellent.",
  tired: "Low battery. No explanation required.",
  stressed: "No extra tasks in here.",
  sad: "A softer corner of the room, then.",
  lonely: "There’s room beside you.",
  bored: "An extremely ambitious nap awaits.",
  feral: "The shelf has been warned.",
  done: "That’ll do for today.",
  horny: "Subtle. Almost.",
};
export function MoodResponse({ mood }: { mood: Mood | null }) {
  return (
    <p className={s.moodResponse} role="status">
      {mood ? replies[mood] : "A mood is enough. No essay required."}
    </p>
  );
}
