import { expect, it } from "vitest";
import {
  activeGesture,
  gestureEyes,
  gestureTarget,
  isReaction,
  paintReaction,
  reactionOffset,
  reactionPose,
} from "./catReactions.js";
import { CAT_REACTION_MS } from "./types.js";
import type { CatGesturePlayback } from "./affection.js";
import { bodyOffset, comfortMoment, tailWag } from "./catComfort.js";

const flop: CatGesturePlayback = { kind: "flop", at: 1, until: CAT_REACTION_MS };

it("defers a reaction through the shelf contact and does not replay an expired one", () => {
  expect(activeGesture(flop, 100, true)).toBeNull();
  expect(activeGesture(flop, 2700, false)).toBe(flop);
  expect(activeGesture(flop, CAT_REACTION_MS, false)).toBeNull();
  expect(isReaction({ ...flop, kind: "nuzzle" })).toBe(false);
});

it("keeps her in place and returns to her existing destination afterward", () => {
  expect(gestureTarget(80, 44, flop)).toBe(44);
  expect(gestureTarget(80, 44, null)).toBe(80);
  expect(gestureTarget(80, 44, { ...flop, kind: "ask" })).toBe(80);
});

it("prepares, flops, then returns to the original pose without keeping it as a mood", () => {
  expect(reactionPose("sit", flop, 0, false, false)).toBe("sit");
  expect(reactionPose("sit", flop, 400, false, false)).toBe("flop");
  expect(reactionPose("sit", flop, CAT_REACTION_MS - 100, false, false)).toBe("sit");
  expect(reactionPose("sit", flop, 0, false, true)).toBe("flop");
  expect(reactionPose("sit", flop, 500, true, true)).toBe("peek");
  expect(reactionOffset(flop, 500, true, true)).toBe(0);
});

it("keeps ambient play and petting recovery out of the reaction", () => {
  const state = {
    reduced: false,
    loaf: true,
    settled: false,
    bounce: 1,
    dancing: true,
    play: 1,
    boxPlaying: true,
    peeking: false,
    peekUntil: 0,
    gesture: { ...flop, kind: "hide-face" as const },
  };
  for (const time of [300, 700, 1500]) expect(bodyOffset(time, state)).toBe(0);
  const moment = comfortMoment({
    time: 700,
    brushAt: { started: 0, last: 700 },
    petDepth: 1,
    stayDepth: 0,
    side: 1,
    busy: false,
    reduced: false,
    affection: flop,
  });
  expect(moment.lean).toBe(0);
  expect(moment.lift).toBe(0);
  for (const time of [300, 700, 1500]) expect(tailWag(time, 1, 1, moment.tailEase, false)).toBe(0);
});

it("hides her face with her selected colors and keeps the reduced-motion pose still", () => {
  const colors = { w: "#402010", f: "#987654", b: "#ffeedd" };
  const hidden = { ...flop, kind: "hide-face" as const };
  const frame = (time: number, reduced: boolean) => {
    const calls: unknown[][] = [];
    paintReaction((...args) => calls.push(args), "sit", 50, 67, colors, hidden, time, reduced);
    return calls;
  };
  expect(frame(500, true).length).toBeGreaterThan(0);
  expect(frame(500, true).every((call) => Object.values(colors).includes(call[4] as string))).toBe(true);
  expect(frame(500, true)).toEqual(frame(3200, true));
  expect(frame(500, false)).not.toEqual(frame(3200, false));
  expect(frame(3600, false)).toEqual([]);
  expect(gestureEyes(hidden, true)).toBe(true);
  expect(gestureEyes({ ...flop, kind: "innocent" }, false)).toBe(true);
});
