import { describe, expect, it } from "vitest";
import { FOUND_ANNOUNCEMENTS } from "./App.js";
import type { DiscoveryKey } from "./discoveries.js";

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
    for (const [key, line] of Object.entries(FOUND_ANNOUNCEMENTS)) {
      expect(line, key).not.toMatch(/unlock|achievement|congrat|you win|complete|level|points?\b/i);
      expect(line, key).toMatch(/\.$/);
    }
  });

  it("says what happened, not that something happened", () => {
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
