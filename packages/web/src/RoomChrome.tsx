import type { ReactNode } from "react";
import type { Mood } from "./types.js";
import s from "./App.module.css";

export function RoomHeader({
  name,
  presence,
  children,
}: {
  name: string;
  presence: string;
  children: ReactNode;
}) {
  return (
    <header className={s.roomHeader}>
      <div>
        <p className={s.roomKicker}>mrrp / a room for two</p>
        <h1 className={s.roomName}>{name}’s room</h1>
        <p className={s.roomPresence}>{presence}</p>
      </div>
      {children}
    </header>
  );
}

export function Invitation({ children, onEnter }: { children: ReactNode; onEnter: () => void }) {
  return (
    <div className={`${s.card} ${s.invitation}`}>
      <p className={s.roomKicker}>A room with your name on it. Sort of.</p>
      <h1 className={s.h1}>You’re the cat.</h1>
      <p className={s.lede}>
        Somebody made you a room. Come in, tap how you feel, and let them keep you company.
      </p>
      <div className={s.stage}>{children}</div>
      <button className={`${s.btn} ${s.btnGo}`} onClick={onEnter}>
        Go in <span aria-hidden>↗</span>
      </button>
      <p className={s.small}>No account. No daily attendance. Naps encouraged.</p>
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
