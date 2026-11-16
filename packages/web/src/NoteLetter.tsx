import { useEffect, useRef } from "react";
import s from "./App.module.css";
import paper from "./NoteLetter.module.css";
import { roomFromPath } from "./api.js";
import { PawMark } from "./screens.js";
import { useNoteLetter } from "./useNoteLetter.js";
import type { Note } from "./types.js";

export function NoteLetter({
  note,
  from,
  replying,
  onReply,
}: {
  note: Note;
  from: string | null;
  replying: boolean;
  onReply: (day: number) => void;
}) {
  const letter = useNoteLetter(roomFromPath(), note);
  const reply = useRef<HTMLButtonElement>(null);
  const fold = useRef<HTMLElement>(null);
  const startedHere = useRef(false);
  useEffect(() => {
    if (!replying && startedHere.current) {
      startedHere.current = false;
      if (letter.open) reply.current?.focus();
      else fold.current?.focus();
    }
  }, [replying, letter.open]);
  return (
    <details
      className={paper.letter}
      open={letter.open}
      onToggle={(event) => letter.setOpen(event.currentTarget.open)}
    >
      <summary ref={fold} className={paper.fold}>
        <span className={paper.from}>{from ?? "He"} left this for you</span>
        <span className={paper.action}>
          <span>{letter.open ? "Fold your note" : "Open your note"}</span>
          <span className={paper.seal} aria-hidden="true">
            <PawMark />
          </span>
        </span>
      </summary>
      <div className={paper.words}>
        <p className={s.noteText}>{note.text}</p>
        {!note.final && <p className={s.noteDay}>day {note.day}</p>}
        {!replying && (
          <button
            ref={reply}
            className={`${s.btn} ${s.btnGo} ${s.noteReply}`}
            onClick={() => {
              startedHere.current = true;
              onReply(note.day - 1);
            }}
          >
            Say something back
          </button>
        )}
      </div>
    </details>
  );
}
