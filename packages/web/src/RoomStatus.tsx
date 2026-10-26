import { ConnectionNotice } from "./ConnectionNotice.js";
import type { LiveState } from "./live.js";
import s from "./App.module.css";

export function RoomStatus({ live, message }: { live: LiveState | null; message: string | null }) {
  return (
    <div className={s.noticeStack}>
      {live && <ConnectionNotice live={live} />}
      {message && (
        <p className={s.errorBar} role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
