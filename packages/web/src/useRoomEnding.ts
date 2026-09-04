import { useState } from "react";
import { doDelete, doLeave, doUndelete, doUnleave, forgetRoom } from "./api.js";

/*
 * The four ways out of a room, and they are not the same weight: leaving takes one side out and the
 * room goes on without it, deleting takes the room away from both of them. Deleting is the one that
 * asks you to type her name first.
 *
 * Neither `ending` nor `undoing` is cleared on success, only on failure. Every path that works ends
 * with the room gone or the page reloading, so turning the button back on would only put a live
 * control on a screen that is already on its way out.
 */
export function useRoomEnding(
  id: string,
  onGone: (undoUntil: number | null) => void,
  onError: (message: string) => void,
) {
  const [armed, setArmed] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [ending, setEnding] = useState(false);
  const [undoing, setUndoing] = useState(false);

  const say = (e: unknown, fallback: string) => onError(e instanceof Error ? e.message : fallback);

  const endRoom = async () => {
    setEnding(true);
    try {
      const undoUntil = await doDelete(id, typedName);
      forgetRoom(id);
      onGone(undoUntil);
    } catch (e) {
      say(e, "Couldn't delete the room.");
      setEnding(false);
    }
  };

  const leave = async () => {
    setEnding(true);
    try {
      await doLeave(id);
      forgetRoom(id);
      window.location.href = "/";
    } catch (e) {
      say(e, "Couldn't leave the room.");
      setEnding(false);
    }
  };

  const putBackMySide = async () => {
    setUndoing(true);
    try {
      await doUnleave(id);
      window.location.reload();
    } catch (e) {
      say(e, "Couldn't put your side back.");
      setUndoing(false);
    }
  };

  const putBackRoom = async () => {
    setUndoing(true);
    try {
      await doUndelete(id);
      window.location.reload();
    } catch (e) {
      say(e, "Couldn't put it back.");
      setUndoing(false);
    }
  };

  return {
    armed,
    setArmed,
    typedName,
    setTypedName,
    ending,
    undoing,
    endRoom,
    leave,
    putBackMySide,
    putBackRoom,
  };
}
