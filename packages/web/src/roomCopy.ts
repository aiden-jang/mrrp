import { hideSeekLabel } from "./hideSeekArt.js";
import type { Scene } from "./hours.js";
import type { RoomView } from "./types.js";

export function roomCaption(
  view: Pick<
    RoomView,
    "hideSeek" | "youAreHer" | "waitingAtDoor" | "settled" | "sittingWith" | "sittingWithYou" | "box"
  >,
  scene: Pick<Scene, "doing" | "doingHers">,
  name: string,
  setup: boolean,
): string {
  if (setup) return "A few small adjustments. The cat has opinions.";
  const hiding = hideSeekLabel(view.hideSeek, view.youAreHer ? "her" : "him");
  if (hiding) return hiding;
  if (view.waitingAtDoor)
    return view.youAreHer
      ? "You are by the door. Company would be good."
      : `${name} is by the door, ready for company.`;
  if (view.settled)
    return view.youAreHer
      ? "You are settled in. Moving seems unnecessary."
      : `${name} has settled against you. Moving seems unnecessary.`;
  if (view.sittingWith || view.sittingWithYou)
    return view.youAreHer ? "You are curled up, with some company." : `${name} is curled up beside you.`;
  if (view.box)
    return view.youAreHer
      ? "A whole room, and you picked the box."
      : `${name} picked the box. The whole room was available.`;
  const doing = view.youAreHer ? (scene.doingHers ?? scene.doing) : scene.doing;
  return view.youAreHer ? `You are ${doing}.` : `${name} is ${doing}.`;
}
