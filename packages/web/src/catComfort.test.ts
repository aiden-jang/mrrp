import { describe, expect, it } from "vitest";
import {
  bodyOffset,
  brushTravel,
  catTouchBounds,
  comfortMoment,
  peekRise,
  recordBrush,
  touchResponse,
} from "./catComfort.js";
import { POSES, type Pose } from "./sprites.js";

const rest = {
  time: 0,
  brushAt: { started: 0, last: 0 },
  petDepth: 0,
  stayDepth: 0,
  side: 1,
  busy: false,
  reduced: false,
};

describe("pleasure without a needs meter", () => {
  it.each(Object.keys(POSES) as Pose[])("keeps touch landmarks on the %s face", (pose) => {
    const bounds = catTouchBounds(pose, 40, 50);
    expect(bounds.noseX).toBeGreaterThan(bounds.x0);
    expect(bounds.noseX).toBeLessThan(bounds.x1);
    expect(bounds.noseY).toBeGreaterThan(bounds.y0);
    expect(bounds.noseY).toBeLessThan(bounds.y1);
    expect(touchResponse(bounds, { x: bounds.noseX, y: bounds.noseY }).nose).toBe(true);
    const chin = touchResponse(bounds, { x: bounds.noseX, y: bounds.noseY + 3 });
    const cheek = touchResponse(bounds, { x: bounds.noseX + 6, y: bounds.noseY });
    expect(chin.chin).toBe(1);
    expect(cheek.side).toBe(1);
    const options = { ...rest, time: 1900, petDepth: 1 };
    expect(comfortMoment({ ...options, touch: chin }).lift).toBeGreaterThan(
      comfortMoment({ ...options, touch: cheek }).lift,
    );
    expect(comfortMoment({ ...options, touch: cheek }).lean).toBeGreaterThan(0);
  });

  it("counts brush distance rather than the number of pointer events", () => {
    const bounds = catTouchBounds("sit", 40, 50);
    const start = { x: bounds.x0 + 1, y: bounds.noseY };
    const mid = { x: start.x + 3, y: start.y };
    const end = { x: start.x + 6, y: start.y };
    expect(brushTravel(bounds, start, end)).toBe(
      brushTravel(bounds, start, mid) + brushTravel(bounds, mid, end),
    );
    expect(brushTravel(bounds, { x: -100, y: -100 }, end)).toBe(0);
  });
  it("leans into a stroke, enjoys it briefly, then returns to herself", () => {
    const start = comfortMoment(rest);
    const pleased = comfortMoment({ ...rest, time: 300 });
    const settled = comfortMoment({ ...rest, time: 1900 });
    expect(start.lean).toBe(0);
    expect(pleased.lean).toBe(1);
    expect(pleased.lift).toBe(1);
    expect(pleased.softEyes).toBe(true);
    expect(settled.lean).toBe(0);
    expect(settled.lift).toBe(0);
    expect(settled.softEyes).toBe(false);
    expect(comfortMoment({ ...rest, time: 300, side: -1 }).lean).toBe(-1);
  });

  it("keeps leaning through continuous strokes rather than restarting anticipation on every move", () => {
    const brushAt = { started: -1e9, last: -1e9 };
    for (let time = 0; time <= 1200; time += 100) recordBrush(brushAt, time);
    expect(comfortMoment({ ...rest, brushAt, time: 1200 }).lean).toBe(1);
    expect(comfortMoment({ ...rest, brushAt, time: 3001 }).lean).toBe(0);
    recordBrush(brushAt, 3100);
    expect(comfortMoment({ ...rest, brushAt, time: 3100 }).lean).toBe(0);
  });

  it("keeps the content expression but removes motion for reduced motion", () => {
    const still = comfortMoment({ ...rest, time: 300, reduced: true });
    expect(still.softEyes).toBe(true);
    expect(still.lean).toBe(0);
    expect(still.lift).toBe(0);
    expect(comfortMoment({ ...rest, time: 300, busy: true }).softEyes).toBe(false);
    expect(comfortMoment({ ...rest, time: 1900, stayDepth: 0.8 }).softEyes).toBe(true);
  });

  it("reveals ears before the held peek, then disappears behind the rim", () => {
    expect(peekRise(1200, false)).toBe(0);
    expect(peekRise(1080, false)).toBeLessThan(peekRise(800, false));
    expect(peekRise(800, false)).toBe(peekRise(500, false));
    expect(peekRise(0, false)).toBe(0);
    expect(new Set([1200, 800, 0].map((time) => peekRise(time, true))).size).toBe(1);
  });

  it("holds the settled body still instead of bouncing in reduced motion", () => {
    const state = {
      reduced: true,
      loaf: true,
      settled: true,
      bounce: 1,
      dancing: true,
      play: 1,
      boxPlaying: false,
      peeking: false,
      peekUntil: 0,
    };
    for (const time of [100, 400, 1200]) expect(bodyOffset(time, state)).toBe(0);
  });
});
