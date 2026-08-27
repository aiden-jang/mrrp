import { describe, expect, it } from "vitest";
import type { Milestone, Personality } from "./types.js";
import { awayLine, AWAY_FLOOR_MS, milestoneLine, personalityLine } from "./remembers.js";

const TRAITS: Personality["trait"][] = ["petted", "brushed", "fed", "accompanied", "photographed"];
const MILESTONES: Milestone[] = [
  { kind: "first-week", years: 0 },
  { kind: "first-month", years: 0 },
  { kind: "anniversary", years: 1 },
  { kind: "anniversary", years: 4 },
];

const allLines = (): string[] => [
  ...MILESTONES.map((m) => milestoneLine(m, "Bean")),
  ...TRAITS.map((trait) => personalityLine({ trait, count: 20 }, false, "Ada")),
  ...TRAITS.map((trait) => personalityLine({ trait, count: 20 }, true, "Ada")),
];

describe("the room's voice", () => {
  it("never congratulates anybody", () => {
    const wrong =
      /congrat|achiev|unlock|milestone|streak|\blevel\b|\bbadge\b|reward|\bearned\b|well done|keep it up/i;
    for (const line of allLines()) expect(line, line).not.toMatch(wrong);
  });

  it("never implies anything owed", () => {
    const wrong =
      /should|don't forget|do not forget|remember to|it has been a while|you haven't|you have not/i;
    for (const line of allLines()) expect(line, line).not.toMatch(wrong);
  });

  it("keeps the tally out of the copy", () => {
    for (const trait of TRAITS) {
      expect(personalityLine({ trait, count: 48 }, false, "Ada")).not.toMatch(/\d/);
      expect(personalityLine({ trait, count: 48 }, true, "Ada")).not.toMatch(/\d/);
    }
  });

  it("does not shout", () => {
    for (const line of allLines()) expect(line, line).not.toContain("!");
  });

  it("uses no em dashes", () => {
    for (const line of allLines()) expect(line, line).not.toMatch(/—/);
  });
});

describe("who each seat is reading about", () => {
  it("never calls the cat 'she' on the side where the cat is you", () => {
    for (const trait of TRAITS) {
      const hers = personalityLine({ trait, count: 20 }, true, "Ada");
      expect(hers, hers).not.toMatch(/\bshe\b|\bher\b/);
    }
  });

  it("never calls her by name on the side that is her", () => {
    for (const trait of TRAITS) {
      expect(personalityLine({ trait, count: 20 }, true, "Ada")).toContain("Ada");
    }
  });

  it("names nobody on his side, since he is 'you'", () => {
    for (const trait of TRAITS) {
      expect(personalityLine({ trait, count: 20 }, false, "Ada")).not.toContain("Ada");
    }
  });

  it("stays a sentence when he has not typed a name yet", () => {
    const line = personalityLine({ trait: "petted", count: 20 }, true, null);
    expect(line).toContain("he ");
    expect(line).not.toMatch(/null|undefined/);
  });

  it("gives every trait both phrasings, distinctly", () => {
    const lines = TRAITS.flatMap((trait) => [
      personalityLine({ trait, count: 20 }, false, "Ada"),
      personalityLine({ trait, count: 20 }, true, "Ada"),
    ]);
    expect(new Set(lines).size).toBe(lines.length);
  });
});

describe("milestones", () => {
  it("says something different for each of the three", () => {
    const lines = MILESTONES.map((m) => milestoneLine(m, "Bean"));
    expect(new Set(lines).size).toBe(lines.length);
  });

  it("counts years in words she would read, not as a field", () => {
    expect(milestoneLine({ kind: "anniversary", years: 1 }, "Bean")).toContain("a year");
    expect(milestoneLine({ kind: "anniversary", years: 4 }, "Bean")).toContain("4 years");
    expect(milestoneLine({ kind: "anniversary", years: 1 }, "Bean")).not.toContain("1 year");
  });

  it("uses the cat's real name", () => {
    for (const milestone of MILESTONES) {
      expect(milestoneLine(milestone, "Pumpkin")).toContain("Pumpkin");
    }
  });
});

describe("coming back", () => {
  const HOUR = 3_600_000;
  const DAY = 24 * HOUR;
  const gaps = [10 * HOUR, 2 * DAY, 9 * DAY, 30 * DAY, 200 * DAY];
  const lines = gaps.map((gap) => awayLine(gap, "Bean")!);

  it("says nothing on a first visit", () => {
    expect(awayLine(null, "Bean")).toBeNull();
  });

  it("says nothing for a refresh", () => {
    expect(awayLine(0, "Bean")).toBeNull();
    expect(awayLine(AWAY_FLOOR_MS - 1, "Bean")).toBeNull();
    expect(awayLine(AWAY_FLOOR_MS, "Bean")).toBeTruthy();
  });

  it("never mentions how long it has been", () => {
    for (const line of lines) {
      expect(line, line).not.toMatch(/\d/);
      expect(line, line).not.toMatch(/week|month|day|been a while|so long|finally|at last|missed you/i);
    }
  });

  it("never asks where you were", () => {
    for (const line of lines) {
      expect(line, line).not.toMatch(/where|why|haven't|have not|forgot|neglect|abandon|sorry/i);
    }
  });

  it("gets warmer with the gap rather than sharper", () => {
    expect(awayLine(200 * DAY, "Bean")).toMatch(/like you never left/);
  });

  it("gives each stretch its own line", () => {
    expect(new Set(lines).size).toBe(lines.length);
  });

  it("uses her name and stays in the room's voice", () => {
    for (const line of awayLine ? gaps.map((gap) => awayLine(gap, "Pumpkin")!) : []) {
      expect(line).toContain("Pumpkin");
      expect(line, line).not.toContain("!");
    }
  });
});
