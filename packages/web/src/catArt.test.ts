import { describe, expect, it } from "vitest";
import { catPalette } from "./catArt.js";
import { roomArt } from "./roomArt.js";
import { POSES, TAIL, type Pose } from "./sprites.js";
import { eyeHighlights, COLLAR } from "./overlays.js";

const names = Object.keys(POSES) as Pose[];
const look = {
  name: "Bean",
  fur: "#747b86",
  furDk: "#505b6c",
  belly: "#fbf0dd",
  eyes: "#d89a4b",
  tabby: false,
};

describe("the pocket room cat", () => {
  it.each(names)("keeps the %s artwork inside its movement and touch bounds", (pose) => {
    const sprite = POSES[pose];
    const art = roomArt(sprite);
    expect(art.ox).toBe(sprite.ox);
    expect(art.oy).toBe(sprite.oy);
    expect(art.rows.length * art.step).toBe(sprite.h);
    expect(art.rows[0]!.length * art.step).toBe(sprite.w);
    expect(art.rows.every((row) => row.length === art.rows[0]!.length)).toBe(true);
    const { l, r, row } = eyeHighlights(pose);
    for (const x of [l, r]) expect(art.rows[row * 2]![Math.round((x - sprite.ox) * 2)]).toBe("f");
    expect(art.rows.join("")).not.toMatch(/[eh]/);
    const collar = COLLAR[pose];
    for (let x = collar.dx; x < collar.dx + collar.w; x++) {
      expect(art.rows[(collar.dy - art.oy) * 2]![(x - art.ox) * 2], `${pose} collar`).not.toBe(".");
    }
  });

  it("keeps her tail in the same pixel style as her body", () => {
    expect(roomArt(TAIL).step).toBe(roomArt(POSES.loaf).step);
  });

  it.each(["#7cb342", "#d89a4b", "#597eaa"])("keeps the chosen %s eyes when she is awake", (eyes) => {
    const colors = catPalette({ ...look, eyes }, true, (color) => color);
    expect(colors.e).toBe(eyes);
    expect(colors.h).toBe("#fffdf6");
    expect(colors.f).toBe(look.fur);
    expect(colors.d).toBe(look.furDk);
    expect(colors.b).toBe(look.belly);
  });

  it("fills closed eyes with her coat color instead of leaving cream squares", () => {
    const colors = catPalette(look, false, (color) => color);
    for (const role of ["e", "h", "c"] as const) expect(colors[role]).toBe(look.fur);
  });
});
