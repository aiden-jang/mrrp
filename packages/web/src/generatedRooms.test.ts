import { describe, expect, it } from "vitest";
import { generatedCatFilter, generatedCatFor, generatedEyeFilter, generatedEyesFor, generatedRoomFor } from "./Cat.js";
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
      "/art/cat/loaf-v3.png", "/art/cat/sit-v3.png", "/art/cat/stand-v3.png",
      "/art/cat/play-v3.png", "/art/cat/perk-v3.png", "/art/cat/walk-v3.png",
      "/art/cat/stretch-v3.png", "/art/cat/pounce-v3.png", "/art/cat/peek-v3.png",
    ]);
  });

  it("keeps ginger unchanged and gives every other fur family a stable treatment", () => {
    const cat = (fur: string) => ({ name: "Bean", fur, furDk: fur, belly: "#fff", eyes: "#7cb342", tabby: false });
    expect(generatedCatFilter(cat("#e8963f"))).toBe("none");
    const filters = ["#e8cfa8", "#9aa0a8", "#4b444a", "#f6f1e8", "#a4703f", "#3f3a40", "#e3a95f"]
      .map((fur) => generatedCatFilter(cat(fur)));
    expect(filters.every((filter) => filter !== "none")).toBe(true);
    expect(new Set(filters).size).toBe(filters.length);
  });

  it("aligns an eye overlay with every pose and treats every selectable eye family", () => {
    const poses: Pose[] = ["loaf", "sit", "stand", "play", "perk", "walk", "stretch", "pounce", "peek"];
    expect(poses.map(generatedEyesFor)).toEqual(poses.map((pose) => `/art/cat-eyes/${pose}-v3.png`));
    expect(generatedEyeFilter("#7cb342")).toBe("none");
    const filters = ["#d79a2b", "#b4652c", "#69a4c4", "#8e9aa0"].map(generatedEyeFilter);
    expect(filters.every((filter) => filter !== "none")).toBe(true);
    expect(new Set(filters).size).toBe(filters.length);
  });
});
