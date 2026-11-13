import { describe, expect, it } from "vitest";
import { catPalette, paintCatEyes } from "./catArt.js";
import { iconMark } from "./iconMark.js";
import { LOOKS, EYES } from "./looks.js";
import { eyeHighlights } from "./overlays.js";
import { roomArt } from "./roomArt.js";
import { roomPainter } from "./roomPainter.js";
import { POSES, type Pose } from "./sprites.js";

const names = Object.keys(POSES) as Pose[];
const look = { name: "Bean", ...LOOKS[0]!.cat, eyes: EYES[0]!.hex };
const open = [".ee.", "ehwe", "ewwe", ".ee."];
const closed = ["....", "....", ".ww.", "w..w"];

function portrait(pose: Pose, expression = { awake: true, wink: false, gaze: 0 }, colors = look, scale = 2) {
  const pixels = new Map<string, string>();
  const context = {
    fillStyle: "",
    fillRect(x: number, y: number, width: number, height: number) {
      expect([x, y, width, height].every(Number.isInteger)).toBe(true);
      for (let row = y; row < y + height; row++)
        for (let col = x; col < x + width; col++) pixels.set(`${col},${row}`, this.fillStyle);
    },
  };
  const palette = catPalette(colors, expression.awake, (color) => color);
  const painter = roomPainter(
    context as unknown as CanvasRenderingContext2D,
    { scale, camera: 0, width: 80, layer: null },
    roomArt,
  );
  painter.blit(POSES[pose], 40, 50, palette);
  paintCatEyes(painter.rect, pose, 40, 50, palette, expression);
  const eye = eyeHighlights(pose);
  const crop = (col: number) =>
    Array.from({ length: 4 }, (_, row) =>
      Array.from({ length: 4 }, (_, cell) => {
        const x = Math.round((40 + col - 1 + cell / 2) * scale);
        const y = Math.round((50 + POSES[pose].oy + eye.row + row / 2) * scale);
        const color = pixels.get(`${x},${y}`);
        return color === colors.eyes ? "e" : color === palette.w ? "w" : color === "#fffdf6" ? "h" : ".";
      }).join(""),
    );
  return { left: crop(eye.l), right: crop(eye.r), pixels };
}

describe("the round-eye design", () => {
  it.each(names)("keeps the selected shape and small highlights on her %s face", (pose) => {
    const face = portrait(pose);
    expect(face.left).toEqual(open);
    expect(face.right).toEqual(open);
  });

  it.each(names)("leaves curved lids without iris or highlights when %s closes her eyes", (pose) => {
    const face = portrait(pose, { awake: false, wink: false, gaze: 0 });
    expect(face.left).toEqual(closed);
    expect(face.right).toEqual(closed);
    expect([...face.pixels.values()]).not.toContain(look.eyes);
  });

  it.each(names)("closes only the right eye for a %s wink", (pose) => {
    const face = portrait(pose, { awake: true, wink: true, gaze: 0 });
    expect(face.left).toEqual(open);
    expect(face.right).toEqual(closed);
  });

  it.each(names)("tracks either way in %s without moving the iris or losing a highlight", (pose) => {
    for (const gaze of [-1, 1]) {
      const face = portrait(pose, { awake: true, wink: false, gaze });
      const expected = gaze < 0 ? [".ee.", "whee", "wwee", ".ee."] : [".ee.", "ehww", "eeww", ".ee."];
      expect(face.left).toEqual(expected);
      expect(face.right).toEqual(expected);
    }
  });

  it.each(LOOKS)("keeps custom eye colors on the $label coat in every pose", ({ cat }) => {
    for (const eyes of [...EYES.map((eye) => eye.hex), "#b72f8a"]) {
      for (const pose of names) {
        const face = portrait(pose, undefined, { name: "Bean", ...cat, eyes });
        expect(face.left).toEqual(open);
        expect(face.right).toEqual(open);
      }
    }
  });

  it.each([1, 2, 3, 6])("keeps visible iris and whole device pixels at scale %s", (scale) => {
    const face = portrait("sit", undefined, undefined, scale);
    expect([...face.pixels.values()].filter((color) => color === look.eyes).length).toBeGreaterThan(0);
  });

  it("keeps eyes and highlights in the matching cat icon", () => {
    const icon = iconMark(look.fur, false, { ...look, eyes: "#b72f8a" });
    expect(icon.match(/fill="#b72f8a"/g)).toHaveLength(16);
    expect(icon.match(/fill="#fffdf6"/g)).toHaveLength(2);
  });
});
