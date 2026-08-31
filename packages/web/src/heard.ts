import type { Cue } from "./sound.js";
import type { Action, LogAction } from "./types.js";

const ACTION_CUE: Record<Action, Cue> = { pet: "purr", brush: "brush", sit: "settle", photo: "shutter" };

/*
 * What it sounds like when the other one does something while you are watching.
 *
 * The same cue their own tap makes, so a pet sounds the same from either side of it. Petting is why
 * this exists: it is the one action that leaves no mark, so it reached her as a silent no-op even
 * once the room started pushing it to her in the same second.
 */
const CUE: Partial<Record<LogAction, Cue>> = {
  ...ACTION_CUE,
  shelf: "thump",
  box: "thump",
  boxout: "thump",
  leaveout: "settle",
  gift: "settle",
};

/*
 * Whether a view that just arrived is them doing something now, rather than something they did
 * before you opened the room.
 *
 * `seen` is null only on the very first view, and that one must never fire: it carries whatever they
 * last did, which could be from an hour ago, and the room would greet you with a purr for it.
 */
export function heard(seen: number | null, at: number | null, action: LogAction | null): Cue | null | false {
  if (at === null) return false;
  if (seen === null || at <= seen) return false;
  return action ? (CUE[action] ?? null) : null;
}
