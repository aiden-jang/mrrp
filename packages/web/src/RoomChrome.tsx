import type { ReactNode } from "react";
import type { Mood } from "./types.js";
import s from "./App.module.css";
import { PawMark } from "./screens.js";

export function RoomWordmark({ children }: { children?: ReactNode }) {
  return (
    <div className={s.roomWordmark}>
      <span className={s.brand} translate="no">
        <PawMark />
        mrrp
      </span>
      <div className={s.roomUtilities}>
        <span>A room for two</span>
        {children}
      </div>
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
      <RoomWordmark>{children}</RoomWordmark>
      <div className={s.roomHeader}>
        <h1 className={s.roomName}>{name}’s room</h1>
        <p className={s.roomPresence}>
          {together && <span className={s.presenceDot} aria-hidden="true" />}
          {presence}
        </p>
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
            Somebody made you a room. You’re the cat. Come in and make yourself comfortable.
          </p>
          <button className={`${s.btn} ${s.btnGo}`} onClick={onEnter}>
            Go in
          </button>
          <p className={s.small}>No account needed. No attendance taken.</p>
        </div>
        <div className={s.stage}>{children}</div>
      </div>
    </div>
  );
}

const replies: Record<Mood, string> = {
  good: "Good. We can work with good.",
  tired: "A fairly reasonable time to do nothing.",
  stressed: "Nothing else to handle in here.",
  sad: "Some quiet company, then.",
  lonely: "You can have some company.",
  bored: "The shelf is available for questioning.",
  feral: "A difficult afternoon for the furniture.",
  done: "That is enough for today.",
  horny: "A change of scenery, then.",
};
export function MoodResponse({ mood }: { mood: Mood | null }) {
  return (
    <p className={s.moodResponse} role="status">
      {mood ? replies[mood] : "How are you feeling? A word will do."}
    </p>
  );
}
