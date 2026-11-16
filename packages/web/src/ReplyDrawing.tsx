import { Sheet } from "./FrameSheet.js";
import s from "./ReplyDrawing.module.css";
export function ReplyDrawing({ cells }: { cells?: string }) {
  return cells ? (
    <span className={s.drawing} role="img" aria-label="A pixel drawing attached to this reply">
      <Sheet cells={cells} />
    </span>
  ) : null;
}
