// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { room, type Room } from "./canvasHarness.js";
import * as comfort from "./catComfort.js";

let current: Room | null = null;
afterEach(() => {
  current?.unmount();
  current = null;
});

it("draws the same progress at low and high refresh rates", () => {
  const positions = [30, 60, 144].map((fps) => {
    current = room({ firstEver: true }, "2026-04-02T14:00:00Z");
    for (let frame = 1; frame / fps < 0.3; frame++) current.frame((frame / fps) * 1000);
    current.frame(300);
    const span = current.furSpan();
    expect(span).not.toBeNull();
    current.unmount();
    current = null;
    return span![0];
  });
  expect(Math.max(...positions) - Math.min(...positions)).toBeLessThanOrEqual(1);
});

it("stops moving horizontally before she rests", () => {
  const poses = vi.spyOn(comfort, "gesturePose");
  current = room({ firstEver: true }, "2026-04-02T14:00:00Z");
  let previousPose = "";
  let previousLeft = 0;
  let idleShift = 0;
  let walkingFrames = 0;
  let restingFrames = 0;
  for (let at = 16; at <= 2400; at += 16) {
    current.frame(at);
    const pose = poses.mock.lastCall![0];
    const left = current.furSpan()![0];
    if (pose === "walk") walkingFrames++;
    else {
      restingFrames++;
      if (previousPose === pose) idleShift += Math.abs(left - previousLeft);
    }
    previousPose = pose;
    previousLeft = left;
  }
  expect(walkingFrames).toBeGreaterThan(0);
  expect(restingFrames).toBeGreaterThan(0);
  expect(idleShift).toBe(0);
});
