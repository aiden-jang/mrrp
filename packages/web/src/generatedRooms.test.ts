import { describe, expect, it } from "vitest";
import { generatedCatFor, generatedRoomFor } from "./Cat.js";
import type { LightPhase } from "./hours.js";
import type { Pose } from "./sprites.js";

describe("generated runtime room states", () => {
  it("has a dedicated image for every authored lighting chapter", () => {
    const phases: LightPhase[] = ["dawn", "day", "golden", "evening", "night"];
    expect(phases.map((phase) => generatedRoomFor(phase))).toEqual([
      "/art/room-dawn-v1.png",
      "/art/room-day-v1.png",
      "/art/room-golden-v1.png",
      "/art/room-evening-v1.png",
      "/art/room-night-v1.png",
    ]);
  });

  it("lets rain temporarily outrank the clock", () => {
    expect(generatedRoomFor("night", true)).toBe("/art/room-rain-v1.png");
  });

  it("maps every authored pose to a generated transparent sprite", () => {
    const poses: Pose[] = ["loaf", "sit", "stand", "play", "perk", "walk", "stretch", "pounce", "peek"];
    expect(poses.map(generatedCatFor)).toEqual([
      "/art/cat/loaf.png", "/art/cat/sit.png", "/art/cat/stand.png",
      "/art/cat/play.png", "/art/cat/perk.png", "/art/cat/walk.png",
      "/art/cat/stretch.png", "/art/cat/pounce.png", "/art/cat/peek.png",
    ]);
  });
});
