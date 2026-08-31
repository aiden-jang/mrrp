import { describe, expect, it } from "vitest";
import src from "./Cat.tsx?raw";

const lineOf = (needle: string): number => {
  const i = src.split("\n").findIndex((l: string) => l.includes(needle));
  expect(i, `not found: ${needle}`).toBeGreaterThan(-1);
  return i;
};

describe("the box's near wall", () => {
  // BOX_FRONT is 28 wide and drawn at BOX_X, so it covers x 44-71 at floor level. TREAT_X is 68 and
  // CATNIP_X is 54, both drawn at FLOOR + 18. Anything drawn before it there gets painted over.
  it("is drawn before the floor props it would otherwise cover", () => {
    const front = lineOf("blit(BOX_FRONT");
    expect(lineOf("if (treating) {")).toBeGreaterThan(front);
    expect(lineOf("if (catnipActive && catnipProgress < 0.28)")).toBeGreaterThan(front);
    expect(lineOf("if (yarnPlaying) {")).toBeGreaterThan(front);
  });

  it("is tappable under the same condition it is drawn under", () => {
    // A box he put out is drawn from `boxOut`, so the hit test has to agree or it cannot be tapped.
    const draw = /const boxHere =\s*([^;]+);/.exec(src)?.[1] ?? "";
    const hit = /const boxIsHere =\s*([^;]+);/.exec(src)?.[1] ?? "";
    for (const ref of ["boxOutRef.current", "boxRef.current", "secretBoxUntil.current"]) {
      expect(draw, `draw gate missing ${ref}`).toContain(ref);
      expect(hit, `hit gate missing ${ref}`).toContain(ref);
    }
  });
});
