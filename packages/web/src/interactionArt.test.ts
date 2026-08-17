import { describe, expect, it } from "vitest";
import { INTERACTION_ART, INTERACTION_BLEND_MODE } from "./interactionArt.js";

describe("generated interaction art", () => {
  it("packages every generated cell under one stable runtime contract", () => {
    expect(Object.keys(INTERACTION_ART)).toHaveLength(20);
    expect(new Set(Object.values(INTERACTION_ART)).size).toBe(20);
    expect(Object.values(INTERACTION_ART).every((path) => path.startsWith("/art/interactions/") && path.endsWith(".png"))).toBe(true);
  });

  it("declares the blend mode required by the black-backed source", () => {
    expect(INTERACTION_BLEND_MODE).toBe("screen");
  });
});
