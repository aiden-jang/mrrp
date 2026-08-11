import { describe, expect, it } from "vitest";
import { advancePawMelody, pianoKeyAt, pianoKeys } from "./piano.js";

describe("paw piano", () => {
  it("keeps every key inside the room near either wall", () => {
    for (const center of [0, 50, 100]) {
      const keys = pianoKeys(center);
      expect(keys[0]!.x).toBeGreaterThanOrEqual(5);
      expect(keys.at(-1)!.x + keys.at(-1)!.width).toBeLessThanOrEqual(95);
    }
  });

  it("hit-tests keys and ignores the floor around them", () => {
    const keys = pianoKeys(50);
    expect(pianoKeyAt(keys, keys[2]!.x + 3, keys[2]!.y + 4)).toBe(2);
    expect(pianoKeyAt(keys, 2, 79)).toBeNull();
  });

  it("recognizes the left-to-right melody and recovers after a wrong note", () => {
    let history: number[] = [];
    for (const note of [4, 0, 1, 0, 1, 2, 3]) history = advancePawMelody(history, note).history;
    expect(advancePawMelody(history, 4)).toEqual({ history: [], complete: true });
  });
});
