import { describe, expect, it } from "vitest";
import { collectConstellationStar, constellationProgress, CONSTELLATION_KEYS } from "./constellation.js";

function memoryStorage(seed: Record<string, string> = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe("room constellation", () => {
  it("keeps each room's discoveries separate", () => {
    const storage = memoryStorage();
    collectConstellationStar("room-a", "window", storage);
    expect(constellationProgress("room-a", storage).found).toEqual(["window"]);
    expect(constellationProgress("room-b", storage).found).toEqual([]);
  });

  it("does not count the same detail twice", () => {
    const storage = memoryStorage();
    expect(collectConstellationStar("room", "plant", storage).discovered).toBe(true);
    expect(collectConstellationStar("room", "plant", storage).discovered).toBe(false);
    expect(constellationProgress("room", storage).found).toEqual(["plant"]);
  });

  it("unlocks exactly when the sixth star is found", () => {
    const storage = memoryStorage();
    for (const key of CONSTELLATION_KEYS.slice(0, -1)) {
      expect(collectConstellationStar("room", key, storage).justCompleted).toBe(false);
    }
    const result = collectConstellationStar("room", CONSTELLATION_KEYS.at(-1)!, storage);
    expect(result.complete).toBe(true);
    expect(result.justCompleted).toBe(true);
    expect(collectConstellationStar("room", "bed", storage).justCompleted).toBe(false);
  });

  it("recovers from malformed or obsolete storage", () => {
    const storage = memoryStorage({
      "mrrp:constellation:room": JSON.stringify({ found: ["window", "window", "roof", 4] }),
    });
    expect(constellationProgress("room", storage)).toEqual({ found: ["window"], complete: false });
  });
});
