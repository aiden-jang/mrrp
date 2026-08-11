import { describe, expect, it } from "vitest";
import { BUBBLE_GAME_MS, bubbleMomentAt, bubbleSeeds } from "./bubbles.js";

describe("bubble easter egg", () => {
  it("keeps all bubbles inside the room even near either wall", () => {
    expect(bubbleSeeds(2).every((bubble) => bubble.x >= 8)).toBe(true);
    expect(bubbleSeeds(98).every((bubble) => bubble.x <= 92)).toBe(true);
  });

  it("stagger-starts, rises, loops, and ends with the game", () => {
    const seed = bubbleSeeds(50)[2]!;
    expect(bubbleMomentAt(seed, seed.delay - 1)).toBeNull();
    const early = bubbleMomentAt(seed, seed.delay + 300)!;
    const later = bubbleMomentAt(seed, seed.delay + 1800)!;
    expect(later.y).toBeLessThan(early.y);
    expect(bubbleMomentAt(seed, BUBBLE_GAME_MS)).toBeNull();
  });

  it("holds still when reduced motion is requested", () => {
    const seed = bubbleSeeds(50)[0]!;
    expect(bubbleMomentAt(seed, 100, true)).toEqual(bubbleMomentAt(seed, 3000, true));
  });
});
