import type { Cue } from "./sound.js";
import type { Action, LogAction } from "./types.js";

const ACTION_CUE: Record<Action, Cue> = { pet: "purr", brush: "brush", sit: "settle", photo: "shutter" };

/* The same cue their own tap makes, so a pet sounds the same from either side of it. */
const CUE: Partial<Record<LogAction, Cue>> = {
  ...ACTION_CUE,
  shelf: "thump",
  box: "thump",
  boxout: "thump",
  leaveout: "settle",
  gift: "settle",
};

/*
 * Did they just do something, or is this the first view of the room?
 *
 * The first view carries whatever they last did, maybe an hour ago. Fire on it and the room greets
 * you with a purr for something you already knew about, so `seen` being null always means no.
 */
export function heard(seen: number | null, at: number | null, action: LogAction | null): Cue | null | false {
  if (at === null) return false;
  if (seen === null || at <= seen) return false;
  return action ? (CUE[action] ?? null) : null;
}
