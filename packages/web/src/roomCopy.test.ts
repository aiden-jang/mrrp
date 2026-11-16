import { describe, expect, it } from "vitest";
import { roomCaption } from "./roomCopy.js";
import { sceneFor } from "./hours.js";
import { MOODS } from "./types.js";

const view = {
  youAreHer: false,
  waitingAtDoor: false,
  settled: false,
  sittingWith: false,
  sittingWithYou: false,
  box: false,
};

describe("the caption each seat reads", () => {
  it("addresses the cat directly across moods and times without naming her as someone else", () => {
    for (const mood of [null, ...MOODS.map((item) => item.id)]) {
      for (const hour of [3, 9, 14, 22]) {
        const scene = sceneFor({ tz: "UTC", homeHour: 19 }, Date.UTC(2026, 10, 15, hour), mood, false);
        const hers = roomCaption({ ...view, youAreHer: true }, scene, "Bean", false);
        expect(hers).toMatch(/^You are /);
        expect(hers).not.toMatch(/Bean|\bshe\b|\bher\b|sitting on you/i);
        expect(roomCaption(view, scene, "Bean", false)).toMatch(/^Bean is /);
      }
    }
  });
  it("keeps shared-room states ahead of ordinary scene copy for both seats", () => {
    const scene = { doing: "loafing", doingHers: "loafing" };
    expect(
      roomCaption({ ...view, youAreHer: true, waitingAtDoor: true, box: true }, scene, "Bean", false),
    ).toContain("You are by the door");
    expect(roomCaption({ ...view, settled: true }, scene, "Bean", false)).toContain(
      "Bean has settled against you",
    );
    expect(roomCaption({ ...view, youAreHer: true, sittingWith: true }, scene, "Bean", false)).toContain(
      "You are curled up",
    );
    expect(roomCaption({ ...view, youAreHer: true, box: true }, scene, "Bean", false)).toBe(
      "A whole room, and you picked the box.",
    );
    expect(roomCaption({ ...view, box: true }, scene, "Bean", true)).toContain("adjustments");
  });
});
