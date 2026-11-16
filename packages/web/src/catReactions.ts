import { CAT_REACTION_MS, isCatReaction, type ReactionAction } from "./types.js";
import type { CatGesturePlayback } from "./affection.js";
import { eyeHighlights } from "./overlays.js";
import { POSES, type Pose } from "./sprites.js";

const HIDDEN_PAW = [
  "...wwww...",
  "..wffffw..",
  ".wfbfbffw.",
  "wffffffffw",
  "wffffffffw",
  "wffffffffw",
  ".wffffffw.",
  ".wffffffw.",
  "..wffffw..",
  "...wwww...",
];

export function isReaction(
  gesture: CatGesturePlayback | null | undefined,
): gesture is CatGesturePlayback & { kind: ReactionAction } {
  return !!gesture && isCatReaction(gesture.kind);
}

export function activeGesture(
  gesture: CatGesturePlayback | null | undefined,
  time: number,
  shelfTrip: boolean,
) {
  return !gesture || gesture.until <= time || (shelfTrip && isReaction(gesture)) ? null : gesture;
}

export function gestureTarget(desired: number, current: number | null, gesture: CatGesturePlayback | null) {
  return isReaction(gesture) ? (current ?? desired) : desired;
}

export function reactionPose(
  pose: Pose,
  gesture: CatGesturePlayback,
  time: number,
  inBox: boolean,
  reduced: boolean,
): Pose {
  if (gesture.kind !== "flop") return "sit";
  if (inBox) return "peek";
  const age = CAT_REACTION_MS - (gesture.until - time);
  return !reduced && (age < 180 || gesture.until - time < 300) ? pose : "flop";
}

export function reactionOffset(
  gesture: CatGesturePlayback | null | undefined,
  time: number,
  reduced: boolean,
  inBox: boolean,
) {
  if (!isReaction(gesture) || gesture.until <= time) return null;
  if (gesture.kind !== "flop" || inBox || reduced) return 0;
  const age = CAT_REACTION_MS - (gesture.until - time);
  return age < 180 ? Math.round(Math.sin((age / 180) * Math.PI)) : 0;
}

export function gestureEyes(gesture: CatGesturePlayback | null | undefined, awake: boolean) {
  return isReaction(gesture) ? gesture.kind !== "flop" : awake;
}

export function paintReaction(
  paint: (x: number, y: number, width: number, height: number, color: string) => void,
  pose: Pose,
  x: number,
  y: number,
  palette: { w: string; f: string; b: string },
  gesture: CatGesturePlayback | null | undefined,
  time: number,
  reduced: boolean,
) {
  if (gesture?.kind !== "hide-face" || gesture.until <= time) return;
  const eyes = eyeHighlights(pose);
  for (const [side, eye] of [eyes.l, eyes.r].entries()) {
    const left = x + eye - 2.5;
    const peek = !reduced && side === 1 && gesture.until - time < 700 ? 3.5 : 0;
    const top = y + POSES[pose].oy + eyes.row - 1.5 + peek;
    paint(left + 1.5, top + 4, 2, 4, palette.f);
    for (const [row, cells] of HIDDEN_PAW.entries()) {
      for (const [col, cell] of [...cells].entries()) {
        if (cell !== ".")
          paint(left + col / 2, top + row / 2, 0.5, 0.5, palette[cell as keyof typeof palette]);
      }
    }
  }
}
