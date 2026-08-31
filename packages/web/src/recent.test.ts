import { describe, expect, it } from "vitest";
import { coveredBy, liveOnly } from "./recent.js";
import type { Arrival, Visit } from "./types.js";

const act = (at: number): Arrival => ({ kind: "action", at, action: "pet" });
const did = (at: number): Visit => ({ at, who: "him", action: "pet" });

describe("splitting the card from the list", () => {
  it("hides exactly what the card showed and nothing else", () => {
    const covered = coveredBy([act(30), act(20)]);
    expect(covered).toBe(30);
    expect(liveOnly([did(40), did(30), did(20)], covered).map((v) => v.at)).toEqual([40]);
  });

  it("shows everything when no card appeared", () => {
    expect(liveOnly([did(9), did(8)], coveredBy([])).map((v) => v.at)).toEqual([9, 8]);
  });

  it("never moves the mark backwards, so a later card cannot resurrect an item", () => {
    expect(coveredBy([act(10)], 50)).toBe(50);
  });

  it("does not let a mood or a line hide the action underneath it", () => {
    // Her mood at 30 is not in theirRecent. If it moved the mark, his real act at 25 would vanish.
    const covered = coveredBy([{ kind: "mood", at: 30, mood: "sad" }, act(20)]);
    expect(covered).toBe(20);
    expect(liveOnly([did(25)], covered).map((v) => v.at)).toEqual([25]);
  });
});
