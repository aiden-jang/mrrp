import type { ReactNode } from "react";
import s from "./App.module.css";
import { Sheet } from "./FrameSheet.js";
import type { Arrival, LogAction, Visit } from "./types.js";
import { ACTIONS, CAT_ACTS, GIFTS, MOODS, TREATS } from "./types.js";

function ArrivalMark({ kind }: { kind: string }) {
  return (
    <svg
      viewBox="0 0 10 10"
      width="10"
      height="10"
      aria-hidden
      focusable="false"
      style={{ display: "block" }}
    >
      {kind === "found" ? (
        <g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          <path d="M5 1v2.4M5 6.6V9M1 5h2.4M6.6 5H9" />
        </g>
      ) : kind === "drawn" ? (
        <rect
          x="1.4"
          y="2"
          width="7.2"
          height="6"
          rx="1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
        />
      ) : kind === "kept" ? (
        <path
          d="M5 1.4c2.4 0 3.6 1.4 3.6 3.4S7.2 8.6 5 8.6 1.4 6.8 1.4 4.8 2.6 1.4 5 1.4z"
          fill="currentColor"
        />
      ) : (
        <circle cx="5" cy="5" r={kind === "line" ? 2.6 : 1.6} fill="currentColor" />
      )}
    </svg>
  );
}

export const FOUND_ANNOUNCEMENTS: Record<string, string> = {
  constellation: "the stars in the window have all come out.",
  roomTour: "the whole room is awake at once.",
  piano: "the floorboards are playing notes.",
  bubbles: "bubbles are drifting through the room.",
  aurora: "lights are moving across the window.",
  mrrp: "she is purring.",
  reached: "you both went for the same thing at the same time.",
  summon: "she has come over.",
  herName: "she knows her own name.",
  box: "a box has turned up.",
  yarn: "there is yarn on the floor now.",
  treat: "she has found a treat.",
  catnip: "the catnip has arrived.",
  music: "music is playing.",
  mouse: "a mouse just ran along the wall.",
  belly: "she has rolled all the way over.",
};

export function whenish(at: number): string {
  const mins = Math.round((Date.now() - at) / 60000);
  if (mins < 3) return "just now";
  if (mins < 60) return `${mins} minutes ago`;
  const sameDay = new Date(at).toDateString() === new Date().toDateString();
  const h = new Date(at).getHours();
  const part = h < 5 ? "in the night" : h < 12 ? "this morning" : h < 18 ? "this afternoon" : "this evening";
  if (sameDay) return part;
  const days = Math.floor((Date.now() - at) / 86400000);
  if (days <= 1) return `yesterday ${part.replace("this ", "")}`;
  return `${days} days ago`;
}

const pastTense = (a: LogAction) =>
  a === "leaveout"
    ? "left something out for you"
    : a === "boxout"
      ? "put a box out for you"
      : (ACTIONS.find((x) => x.id === a)?.past ?? CAT_ACTS.find((x) => x.id === a)?.past ?? "was here");

export const FOUND_AS_HER: Record<string, string> = {
  mrrp: "you are purring.",
  summon: "you came over.",
  herName: "you know your own name.",
  treat: "you have found a treat.",
  belly: "you rolled all the way over.",
};

const FOUND_NAMES_AS_HER: Record<string, string> = {
  mrrp: "what you do when he says your word",
  summon: "that you come when called",
  herName: "that you know your own name",
  belly: "that you will roll over for the two of you",
};

const FOUND_NAMES: Record<string, string> = {
  constellation: "the stars in the window",
  roomTour: "every corner of the room",
  piano: "the piano in the floorboards",
  bubbles: "the bubbles",
  aurora: "the lights over the window",
  mrrp: "what she does when you say her word",
  summon: "that she comes when called",
  herName: "that she knows her own name",
  box: "the box that turns up",
  yarn: "the yarn",
  treat: "where the treats are",
  catnip: "the catnip",
  music: "the music",
  mouse: "the mouse",
  belly: "that she will roll over for the two of you",
};

const FIRSTS: Record<string, string> = {
  snow: "it has snowed on this room, for the first time.",
  rain: "it has rained on this room, for the first time.",
  storm: "the first storm this room has been through.",
  held: "the first time he reached you while you were here to feel it.",
  settled: "the first time you settled against somebody who had sat down with you.",
};

export function ArrivalCard({
  name,
  items,
  youAreHer,
  onClose,
}: {
  name: string;
  items: Arrival[];
  youAreHer: boolean;
  onClose: () => void;
}) {
  return (
    <section className={s.arrival} aria-label="Things the room kept for you">
      <div className={s.arrivalTop}>
        <div>
          <p className={s.arrivalTitle}>the room kept this for you</p>
          <p className={s.small} style={{ marginTop: 2 }}>
            It waited here until you looked in.
          </p>
        </div>
        <button type="button" onClick={onClose} className={s.arrivalClose} aria-label="Put away arrival card">
          ×
        </button>
      </div>
      <ul className={s.arrivalList}>
        {items.map((item, index) => (
          <li key={`${item.kind}-${item.at}-${index}`} className={s.arrivalItem}>
            <span className={s.arrivalPaw} aria-hidden>
              <ArrivalMark kind={item.kind} />
            </span>
            <span>
              {item.kind === "action" ? (
                <>
                  <b>{name}</b> {pastTense(item.action)}.
                </>
              ) : item.kind === "mood" ? (
                <>
                  <b>{name}</b> said she was {MOODS.find((m) => m.id === item.mood)?.said ?? item.mood}.
                </>
              ) : item.kind === "found" ? (
                item.what ? (
                  <>
                    <b>{name}</b> found{" "}
                    {(youAreHer ? FOUND_NAMES_AS_HER[item.what] : undefined) ??
                      FOUND_NAMES[item.what] ??
                      "something in here"}{" "}
                    too.
                  </>
                ) : (
                  <>
                    <b>{name}</b> found something in here you haven&apos;t seen yet.
                  </>
                )
              ) : item.kind === "drawn" ? (
                <>
                  <b>{name}</b> put something in the frame. <Sheet cells={item.cells} />
                </>
              ) : item.kind === "undrawn" ? (
                <>
                  <b>{name}</b> took a photo, so what you drew came down.
                </>
              ) : item.kind === "kept" ? (
                <>
                  <b>{name}</b> took the {GIFTS.find((g) => g.id === item.gift)?.name ?? "thing"} you left.
                </>
              ) : item.kind === "first" ? (
                <>{FIRSTS[item.what] ?? "something happened here for the first time."}</>
              ) : item.kind === "took" ? (
                <>
                  <b>{name}</b> {TREATS.find((t) => t.id === item.treat)?.found ?? "found what you left out"}.
                </>
              ) : item.kind === "brought" ? (
                <>
                  <b>{name}</b> left {TREATS.find((t) => t.id === item.treat)?.label ?? "something"} out for
                  you.
                </>
              ) : item.note ? (
                <>
                  <b>{name}</b> answered you.
                  <span className={s.answerPair}>
                    <span className={s.answerMine}>“{item.note}”</span>
                    <span className={s.answerHers}>“{item.text}”</span>
                  </span>
                </>
              ) : item.gift ? (
                <>
                  <b>{name}</b> left you {GIFTS.find((g) => g.id === item.gift)?.label ?? "something"}, and
                  said: “{item.text}”
                </>
              ) : (
                <>
                  <b>{name}</b> left: “{item.text}”
                </>
              )}
              <small className={s.arrivalWhen}>{whenish(item.at)}</small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TheirRecent({ subject, items }: { subject: ReactNode; items: Visit[] }) {
  if (items.length === 0) return null;
  return (
    <ul className={s.recent}>
      {items.map((visit) => (
        <li key={`${visit.at}-${visit.action}`} className={s.recentItem}>
          {subject} {pastTense(visit.action)}, {whenish(visit.at)}.
        </li>
      ))}
    </ul>
  );
}
