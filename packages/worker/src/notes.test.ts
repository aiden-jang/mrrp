import { describe, expect, it } from "vitest";
import { NOTES } from "./notes.js";

describe("the notes she reads", () => {
  it("never talks about a cat in the third person", () => {
    /*
     * She is the cat, and these are read by her and nobody else. Twenty of the original thirty were
     * written for a reader who owned a cat, which is the model the whole app moved away from, and
     * they were the last place still holding the old one.
     */
    const stale = NOTES.filter((n) => /\b(she|her|hers)\b/i.test(n));
    expect(stale, `notes talking about a third person: ${stale.join(" | ")}`).toEqual([]);
  });

  it("still has enough to go round without repeating for a month", () => {
    expect(NOTES.length).toBeGreaterThanOrEqual(30);
  });
});
