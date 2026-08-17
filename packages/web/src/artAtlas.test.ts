import { describe, expect, it } from "vitest";
import { validateAtlasManifest } from "./artAtlas.js";

const manifest = () => ({
  version: 1,
  image: "room.png",
  pixelRatio: 2,
  frames: {
    window: {
      x: 0, y: 0, width: 40, height: 28, anchorX: 0, anchorY: 0,
      hit: { x: 60, y: 4, width: 16, height: 12 },
    },
    catSit: {
      x: 40, y: 0, width: 48, height: 40, anchorX: 12, anchorY: 20,
      paletteSlots: ["fur", "belly", "eyes"],
    },
  },
});

describe("layered art atlas manifests", () => {
  it("keeps source pixels, anchors, palette slots, and logical hit regions together", () => {
    expect(validateAtlasManifest(manifest())).toEqual(manifest());
  });

  it("rejects fractional source rectangles that would blur at runtime", () => {
    const broken = manifest();
    broken.frames.window.x = 0.5;
    expect(() => validateAtlasManifest(broken)).toThrow(/window.x/);
  });

  it("rejects zero-size frames and hit regions", () => {
    const brokenFrame = manifest();
    brokenFrame.frames.window.width = 0;
    expect(() => validateAtlasManifest(brokenFrame)).toThrow(/window.width/);

    const brokenHit = manifest();
    brokenHit.frames.window.hit!.height = 0;
    expect(() => validateAtlasManifest(brokenHit)).toThrow(/window.hit.height/);
  });

  it("requires an integer source-to-logical pixel ratio", () => {
    expect(() => validateAtlasManifest({ ...manifest(), pixelRatio: 1.5 })).toThrow(/pixelRatio/);
  });
});
