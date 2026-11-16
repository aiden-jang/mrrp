import { POSES, type Pose } from "./sprites.js";
import { NUZZLE_MS } from "./types.js";
import type { CatGesturePlayback } from "./affection.js";
export type { CatGesturePlayback } from "./affection.js";
import * as reactions from "./catReactions.js";
export { activeGesture, gestureTarget, isReaction, gestureEyes } from "./catReactions.js";

export function gesturePose(
  pose: Pose,
  affection: CatGesturePlayback | null | undefined,
  time: number,
  inBox = false,
  reduced = false,
): Pose {
  if (reactions.isReaction(affection) && affection.until > time)
    return reactions.reactionPose(pose, affection, time, inBox, reduced);
  return affection?.kind === "ask" &&
    affection.until > time &&
    ["sit", "loaf", "perk", "stand", "flop", "play"].includes(pose)
    ? "sit"
    : pose;
}

export function paintGesture(
  paint: Parameters<typeof paintRaisedPaw>[0],
  pose: Pose,
  x: number,
  y: number,
  palette: { w: string; f: string; b: string; p: string },
  gesture: CatGesturePlayback | null,
  time: number,
  reduced: boolean,
  inBox: boolean,
) {
  if (gesture?.kind === "ask" && pose === "sit") paintRaisedPaw(paint, x, y, palette, inBox);
  reactions.paintReaction(paint, pose, x, y, palette, gesture, time, reduced);
}

export function tailAnchor(pose: Pose, x: number, y: number) {
  return {
    x:
      pose === "stand"
        ? x - 12
        : pose === "loaf"
          ? x + 8
          : pose === "stretch"
            ? x + 14
            : pose === "pounce"
              ? x + 9
              : x + 5,
    y: pose === "loaf" ? y - 4 : pose === "perk" ? y - 9 : y - 6,
    flip: pose === "stand",
  };
}

export function tailWag(time: number, play: number, near: number, ease: number, reduced: boolean) {
  return reduced || ease === 0
    ? 0
    : Math.round(Math.sin(time / (620 - play * 380)) * (1 + play * 2 + near) * ease);
}

export function paintRaisedPaw(
  paint: (x: number, y: number, width: number, height: number, color: string) => void,
  x: number,
  y: number,
  palette: { w: string; f: string; b: string; p: string },
  inBox = false,
) {
  if (!inBox) paint(x + 0.5, y - 2.5, 3, 1.5, palette.f);
  y -= inBox ? 5 : 0;
  paint(x + 3, y - 5, 3, 3, palette.w);
  paint(x + 3.5, y - 4.5, 2, 2, palette.f);
  paint(x + 5, y - 8, 3, 4.5, palette.w);
  paint(x + 4.5, y - 7.5, 4, 3.5, palette.w);
  paint(x + 5, y - 7.5, 3, 3.5, palette.f);
  paint(x + 5, y - 7.5, 3, 1.5, palette.b);
  paint(x + 5.5, y - 5.5, 1.5, 1, palette.p);
  paint(x + 5.5, y - 7, 0.5, 0.5, palette.p);
  paint(x + 7, y - 7, 0.5, 0.5, palette.p);
}

interface Point {
  x: number;
  y: number;
}
interface TouchBounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  noseX: number;
  noseY: number;
}

export function catTouchBounds(pose: Pose, x: number, y: number): TouchBounds {
  const sprite = POSES[pose];
  const row = sprite.rows.findIndex((line) => line.includes("nn"));
  return {
    x0: x + sprite.ox,
    y0: y + sprite.oy,
    x1: x + sprite.ox + sprite.w,
    y1: y + sprite.oy + sprite.h,
    noseX: x + sprite.ox + sprite.rows[row]!.indexOf("nn") + 1,
    noseY: y + sprite.oy + row + 0.25,
  };
}

export function touchResponse(bounds: TouchBounds | null, point: Point) {
  if (!bounds) return { side: 0, chin: 0, nose: false };
  const dx = point.x - bounds.noseX;
  const dy = point.y - bounds.noseY;
  return {
    side: Math.max(-1, Math.min(1, dx / 6)),
    chin: Math.abs(dx) < 6 && dy > 1 && dy < 5 ? 1 : 0,
    nose: Math.hypot(dx, dy) < 2.5,
  };
}

export function brushTravel(bounds: TouchBounds | null, from: Point, to: Point) {
  const inside = (p: Point) =>
    bounds && p.x >= bounds.x0 - 1 && p.x <= bounds.x1 + 1 && p.y >= bounds.y0 - 1 && p.y <= bounds.y1 + 2;
  return inside(from) && inside(to) ? Math.hypot(to.x - from.x, to.y - from.y) : 0;
}

interface BrushMoment {
  started: number;
  last: number;
}

/** Continuous strokes share one anticipation; a pause starts a fresh one. */
export function recordBrush(moment: BrushMoment, time: number) {
  if (time - moment.last > 250) moment.started = time;
  moment.last = time;
}

/** A little anticipation, pleasure, then composure. No persistent needs or reward meter. */
export function comfortMoment({
  time,
  brushAt,
  petDepth,
  stayDepth,
  side,
  busy,
  reduced,
  touch,
  affection,
}: {
  time: number;
  brushAt: BrushMoment;
  petDepth: number;
  stayDepth: number;
  side: number;
  busy: boolean;
  reduced: boolean;
  touch?: { side: number; chin: number } | null;
  affection?: CatGesturePlayback | null;
}) {
  const age = time - brushAt.started;
  const released = time - brushAt.last;
  const brush = age < 0 || released > 1800 ? 0 : Math.min(1, age / 180, (1800 - released) / 850);
  const reacting = reactions.isReaction(affection) && affection.until > time;
  const content = busy || reacting ? 0 : Math.max(brush, petDepth);
  const nuzzling = !busy && affection?.kind === "nuzzle" && affection.until > time;
  const progress = nuzzling ? 1 - Math.min(1, (affection.until - time) / NUZZLE_MS) : 0;
  const nuzzle = Math.sin(Math.PI * progress);
  return {
    asking: !busy && affection?.kind === "ask" && affection.until > time,
    lift:
      reduced || busy || reacting
        ? 0
        : Math.round((content * (touch ? 0.5 + touch.chin : 1) + nuzzle) * 2) / 2,
    lean:
      reduced || busy || reacting
        ? 0
        : Math.round(
            ((touch ? touch.side * petDepth * 1.5 : Math.sign(side) * brush) +
              nuzzle * (Math.sign(side) || 1) * 2) *
              2,
          ) / 2,
    softEyes: nuzzling || content > 0.35 || (!busy && stayDepth > 0.45),
    tailEase: reacting ? 0 : busy ? 1 : 1 - Math.max(content, stayDepth * 0.8) * 0.7,
  };
}

export function peekRise(remaining: number, reduced: boolean) {
  if (reduced) return 3;
  const progress = Math.max(0, Math.min(1, 1 - remaining / 1200));
  // Ears first, a deliberate peek, then back behind the rim.
  return progress < 0.25
    ? Math.round(progress * 20)
    : progress < 0.7
      ? 5
      : Math.round(((1 - progress) / 0.3) * 5);
}

/** Pixel-snapped body motion shares the same timing in every coat and viewport. */
export function bodyOffset(
  time: number,
  state: {
    reduced: boolean;
    loaf: boolean;
    settled: boolean;
    bounce: number;
    dancing: boolean;
    play: number;
    boxPlaying: boolean;
    peeking: boolean;
    peekUntil: number;
    gesture?: CatGesturePlayback | null;
    inBox?: boolean;
  },
) {
  const { reduced, loaf, settled, bounce, dancing, play, boxPlaying, peeking, peekUntil } = state;
  const reaction = reactions.reactionOffset(state.gesture, time, reduced, state.inBox ?? false);
  if (reaction !== null) return reaction;
  const breath =
    reduced || !loaf ? 0 : Math.round(Math.sin(time / (settled ? 1900 : 1100)) * (settled ? 1.6 : 1));
  const hop = reduced
    ? 0
    : Math.round(bounce * 3) +
      (dancing
        ? Math.round(Math.abs(Math.sin(time / 145)) * 3)
        : play > 0.5
          ? Math.round(Math.abs(Math.sin(time / 260)) * 2)
          : 0);
  const peek = boxPlaying
    ? reduced
      ? 5
      : 4 + Math.round(Math.abs(Math.sin(time / 210)) * 3)
    : peeking
      ? peekRise(peekUntil - time, reduced)
      : 0;
  return breath - hop - peek;
}

/** Purr marks stay present and still when motion is reduced. */
export function paintPurr(
  paint: (x: number, y: number, color: string) => void,
  time: number,
  x: number,
  top: number,
  strength: number,
  reduced: boolean,
) {
  for (let i = 0; i < 2; i++) {
    const progress = reduced ? 0.25 + i * 0.4 : (time / 1500 + i * 0.5) % 1;
    const y = Math.round(top - 2 - progress * 7);
    const color = `rgba(255,255,255,${strength * (1 - progress)})`;
    paint(x, y, color);
    paint(x + 1, y - 1, color);
    paint(x + 2, y, color);
  }
}
