// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { room, SHELF_WOOD, type Room } from "./canvasHarness.js";
import { SHELF_TIP_MS } from "./shelftrip.js";

const MUG = "#cfe0e4";
let r: Room | null = null;
afterEach(() => {
  r?.unmount();
  r = null;
});

describe("the room actually draws", () => {
  it("paints the cat, so every other assertion here means something", () => {
    r = room();
    r.frame(16);
    expect(r.furSpan(), "she is on screen").not.toBeNull();
  });
});

describe("her trip to the shelf", () => {
  it("keeps the mug up while she walks, then puts it on the floor", () => {
    // The room says the mug is down from the start. She has not got there yet.
    r = room({ shelfDown: true, shelfAt: 1 });
    r.frame(16);
    expect(r.count(MUG, 56, 70), "not on the floor yet").toBe(0);

    r.run(32, SHELF_TIP_MS - 100);
    expect(r.count(MUG, 56, 70), "still not on the floor").toBe(0);

    r.run(SHELF_TIP_MS - 84, SHELF_TIP_MS + 100);
    expect(r.count(MUG, 56, 70), "over it goes").toBeGreaterThan(0);
  });

  it("brings the shelf on screen, which is the whole point of walking there", () => {
    // The shelf sits at x 80-95 with an 80 wide viewport, so it is only ever seen when she is.
    // Just before the hour he is due home, when she waits by the door: as far from the shelf as she
    // ever gets, and the case the feature exists for.
    r = room({}, "2026-04-02T17:40:00Z");
    r.run(0, 400);
    const shelfBefore = r.count(SHELF_WOOD, 20, 30);

    // She knocks it off from where she is, which is the only realistic way this starts.
    r.set({ shelfDown: true, shelfAt: 1 });
    r.run(416, 416 + SHELF_TIP_MS);
    // She walks right, the camera follows her, and that is the only thing that ever brings the
    // shelf into view. Nothing else in the room moves the camera.
    expect(r.count(SHELF_WOOD, 20, 30), "more of the shelf is in view").toBeGreaterThan(shelfBefore);
  });

  it("draws the mug on the floor with no trip at all", () => {
    // Opening a room where she knocked it off hours ago: no walk, the mug is simply down.
    r = room({ shelfDown: true });
    r.frame(16);
    expect(r.count(MUG, 56, 70)).toBeGreaterThan(0);
  });
});

describe("the box's near wall", () => {
  it("does not cover the mug she knocked off", () => {
    r = room({ shelfDown: true, boxOut: true });
    r.frame(16);
    // This is the bug that took three reports to find: the box is drawn over x 44-71 at floor
    // level and the mug lands at 66, so drawn in the wrong order it vanishes underneath.
    expect(r.count(MUG, 56, 70), "mug visible with a box out").toBeGreaterThan(0);
  });

  it("does not cover her mood while she is sitting in it", () => {
    const stressedMat = "#b68486";
    r = room({ boxOut: true, box: true, mood: "stressed" });
    // Long enough for her to have eased all the way into it: her mood props ride at kx +- 13, so
    // they only land inside the box once she is actually sitting in it.
    r.run(16, 1400);
    // Twenty, not one. Three cells of the mat peek past the box whichever order they are drawn in,
    // so "greater than zero" passes with her mood entirely hidden.
    expect(r.count(stressedMat, 55, 75), "her mood survives the box").toBeGreaterThan(20);
  });
});
