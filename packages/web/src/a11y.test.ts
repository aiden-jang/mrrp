import { describe, expect, it } from "vitest";
import { FOUND_ANNOUNCEMENTS } from "./App.js";
import type { DiscoveryKey } from "./discoveries.js";

/*
 * Every secret has to be sayable.
 *
 * The reward for most of these is purely visual: the window fills with stars, the floorboards light up,
 * bubbles drift across the room. Somebody using a screen reader does the work of finding one and, without
 * a line here, is told nothing at all. That is worse than the secret not existing, because they did the
 * finding and got silence.
 *
 * So this test exists to fail when a fourteenth secret gets a visual and no sentence. The discovery keys
 * are the allowlist the Worker already validates against, which makes them the right source of truth.
 */

const DISCOVERY_KEYS: DiscoveryKey[] = [
  "constellation",
  "roomTour",
  "piano",
  "bubbles",
  "aurora",
  "mrrp",
  "summon",
  "herName",
  "box",
  "yarn",
  "treat",
  "catnip",
  "music",
  "mouse",
];

describe("spoken discoveries", () => {
  it("has a line for every secret the room can report", () => {
    const missing = DISCOVERY_KEYS.filter((key) => !FOUND_ANNOUNCEMENTS[key]);
    expect(missing, "these secrets would fire silently for a screen reader").toEqual([]);
  });

  it("describes the room rather than congratulating anybody", () => {
    // "Unlocked", "achievement", "you win" would make a room into a game with a score.
    for (const [key, line] of Object.entries(FOUND_ANNOUNCEMENTS)) {
      expect(line, key).not.toMatch(/unlock|achievement|congrat|you win|complete|level|points?\b/i);
      // A sentence, so a reader does not run it into whatever follows.
      expect(line, key).toMatch(/\.$/);
    }
  });

  it("says what happened, not that something happened", () => {
    /*
     * Word count was the first version of this and it was a bad proxy: "she is purring." is three words
     * and entirely specific, while a long sentence can say nothing. What actually matters is that no line
     * falls back to the vague word, and that no two secrets share a description, since a duplicate means
     * one of them is being announced as the other.
     */
    const lines = Object.values(FOUND_ANNOUNCEMENTS);
    expect(new Set(lines).size, "two secrets share a description").toBe(lines.length);
    for (const [key, line] of Object.entries(FOUND_ANNOUNCEMENTS)) {
      expect(line, `${key} is too vague to be worth speaking`).not.toMatch(/\bsomething\b/i);
    }
  });

  it("stays in the room's lowercase voice", () => {
    for (const [key, line] of Object.entries(FOUND_ANNOUNCEMENTS)) {
      expect(line[0], key).toBe(line[0]!.toLowerCase());
    }
  });
});
