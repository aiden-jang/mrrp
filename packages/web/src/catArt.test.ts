import { describe, expect, it } from "vitest";
import { catPalette } from "./catArt.js";
import { roomArt } from "./roomArt.js";
import { POSES, TAIL, type Pose } from "./sprites.js";

const names = Object.keys(POSES) as Pose[];
const look = {
  name: "Bean",
  fur: "#747b86",
  furDk: "#505b6c",
  belly: "#fbf0dd",
  eyes: "#d89a4b",
  tabby: false,
};

describe("the original cat artwork", () => {
  it.each(names)("preserves the %s face, silhouette and movement anchor", (pose) => {
    const sprite = POSES[pose];
    expect(roomArt(sprite)).toEqual({ rows: sprite.rows, step: 1, ox: sprite.ox, oy: sprite.oy });
  });

  it("keeps her tail in the same pixel style as her body", () => {
    expect(roomArt(TAIL)).toEqual({ rows: TAIL.rows, step: 1, ox: TAIL.ox, oy: TAIL.oy });
  });

  it.each(["#7cb342", "#d89a4b", "#597eaa"])("keeps the chosen %s eyes when she is awake", (eyes) => {
    const colors = catPalette({ ...look, eyes }, true, (color) => color);
    expect(colors.e).toBe(eyes);
    expect(colors.h).toBe("#fffdf6");
    expect(colors.f).toBe(look.fur);
    expect(colors.d).toBe(look.furDk);
    expect(colors.b).toBe(look.belly);
  });

  it("fills closed eyes and cheeks with her face color instead of leaving holes", () => {
    const colors = catPalette(look, false, (color) => color);
    for (const role of ["e", "h", "c"] as const) expect(colors[role]).toBe(look.belly);
  });
});
