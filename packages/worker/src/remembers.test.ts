import { describe, expect, it } from "vitest";
import {
  TRAIT_MINIMUM,
  TRAIT_MIN_DAYS,
  TRAIT_SHARE,
  homingWith,
  learnedHour,
  milestoneFor,
  personalityFrom,
  roomStartedAt,
  tallyFrom,
  type Homing,
} from "./remembers.js";

const DAY = 86_400_000;
const AT = (iso: string) => Date.parse(iso);

describe("anniversaries", () => {
  const tz = "America/New_York";

  it("finds the day the room started, a year on", () => {
    const found = milestoneFor(AT("2025-08-12T15:00:00Z"), AT("2026-08-12T15:00:00Z"), tz);
    expect(found).toEqual({ kind: "anniversary", years: 1 });
  });

  it("counts the years", () => {
    expect(milestoneFor(AT("2023-08-12T15:00:00Z"), AT("2026-08-12T15:00:00Z"), tz)?.years).toBe(3);
  });

  it("says nothing on an ordinary day", () => {
    expect(milestoneFor(AT("2025-08-12T15:00:00Z"), AT("2026-08-13T15:00:00Z"), tz)).toBeNull();
  });

  it("does not celebrate the day it started", () => {
    expect(milestoneFor(AT("2026-08-12T15:00:00Z"), AT("2026-08-12T18:00:00Z"), tz)).toBeNull();
  });

  it("answers in her timezone, not the server's", () => {
    const started = AT("2025-08-12T15:00:00Z");
    const herEveningOfThe12th = AT("2026-08-13T01:00:00Z");
    const herEarlyThe13th = AT("2026-08-13T05:00:00Z");

    expect(milestoneFor(started, herEveningOfThe12th, "America/New_York")?.years).toBe(1);
    expect(milestoneFor(started, herEarlyThe13th, "America/New_York")).toBeNull();
  });

  it("gives a 29 February room its day in a common year", () => {
    const found = milestoneFor(AT("2024-02-29T15:00:00Z"), AT("2027-03-01T15:00:00Z"), tz);
    expect(found).toEqual({ kind: "anniversary", years: 3 });
  });

  it("keeps 29 February on the 29th when there is one", () => {
    expect(milestoneFor(AT("2024-02-29T15:00:00Z"), AT("2028-02-29T15:00:00Z"), tz)?.years).toBe(4);
    expect(milestoneFor(AT("2024-02-29T15:00:00Z"), AT("2028-03-01T15:00:00Z"), tz)).toBeNull();
  });

  it("marks the first week and the first month, exactly once each", () => {
    const start = AT("2026-08-01T15:00:00Z");
    expect(milestoneFor(start, start + 7 * DAY, tz)?.kind).toBe("first-week");
    expect(milestoneFor(start, start + 30 * DAY, tz)?.kind).toBe("first-month");
    for (const day of [6, 8, 29, 31]) {
      expect(milestoneFor(start, start + day * DAY, tz), `day ${day}`).toBeNull();
    }
  });
});

describe("when the room started", () => {
  const now = AT("2026-08-12T15:00:00Z");

  it("is the first of them to open the door, not the most recent", () => {
    const her = AT("2025-03-04T10:00:00Z");
    const him = AT("2025-03-09T10:00:00Z");
    expect(roomStartedAt([him, her], now)).toBe(her);
  });

  it("is today for a room nobody has sat in", () => {
    expect(roomStartedAt([], now)).toBe(now);
    expect(milestoneFor(roomStartedAt([], now), now, "America/New_York")).toBeNull();
  });

  it("ignores a timestamp that is not one", () => {
    const real = AT("2025-03-04T10:00:00Z");
    expect(roomStartedAt([NaN, real], now)).toBe(real);
    expect(roomStartedAt([NaN], now)).toBe(now);
  });
});

describe("what she comes to expect", () => {
  const SETTLED = TRAIT_MIN_DAYS + 60;

  it("has no personality on the day the room is made, however much happens in it", () => {
    expect(personalityFrom({ pet: 50 }, 0)).toBeNull();
    expect(personalityFrom({ pet: 50 }, TRAIT_MIN_DAYS - 1)).toBeNull();
    expect(personalityFrom({ pet: 50 }, TRAIT_MIN_DAYS)?.trait).toBe("petted");
  });

  it("still needs the count once the room is old enough", () => {
    expect(personalityFrom({ pet: 3 }, SETTLED)).toBeNull();
  });

  it("stays silent rather than guessing when the room's age is not a number", () => {
    expect(personalityFrom({ pet: 50 }, NaN)).toBeNull();
  });

  it("has no personality early on", () => {
    expect(personalityFrom({ pet: TRAIT_MINIMUM - 1 }, SETTLED)).toBeNull();
  });

  it("emerges once there is enough history", () => {
    expect(personalityFrom({ pet: TRAIT_MINIMUM }, SETTLED)).toEqual({
      trait: "petted",
      count: TRAIT_MINIMUM,
    });
  });

  it("names the thing that actually dominates", () => {
    expect(personalityFrom({ brush: 10, pet: 3, sit: 2 }, SETTLED)?.trait).toBe("brushed");
  });

  it("stays silent when nothing really dominates", () => {
    const spread = { pet: 5, brush: 4, sit: 4, leaveout: 4 };
    expect(5 / 17).toBeLessThan(TRAIT_SHARE);
    expect(personalityFrom(spread, SETTLED)).toBeNull();
  });

  it("stays silent on a tie", () => {
    expect(personalityFrom({ pet: 8, brush: 8 }, SETTLED)).toBeNull();
  });

  it("does not flip on a single visit", () => {
    expect(personalityFrom({ sit: 20, pet: 4 }, SETTLED)?.trait).toBe("accompanied");
    expect(personalityFrom({ sit: 20, pet: 4, photo: 1 }, SETTLED)?.trait).toBe("accompanied");
  });

  it("has nothing to say about an empty room", () => {
    expect(personalityFrom({}, SETTLED)).toBeNull();
  });

  it("keeps counting past the length of the visit log", () => {
    const seeded = tallyFrom(
      Array.from({ length: 40 }, (_, i) => ({ at: i, who: "him", action: "sit" as const })),
    );
    expect(seeded).toEqual({ sit: 40 });
    const later = { ...seeded, sit: seeded.sit! + 40, photo: 6 };
    expect(personalityFrom(later, SETTLED)?.count).toBe(80);
  });
});

describe("learning when he actually turns up", () => {
  const build = (hours: number[]): Homing | null => {
    let h: Homing | null = null;
    hours.forEach((hour, day) => {
      h = homingWith(h, hour, day) ?? h;
    });
    return h;
  };

  it("counts a day once, however many times he opens the room", () => {
    const first = homingWith(null, 17, 100);
    expect(first).toEqual({ hour: 17, days: 1, lastDay: 100 });
    expect(homingWith(first, 22, 100)).toBeNull();
    expect(homingWith(first, 22, 101)?.days).toBe(2);
  });

  it("says nothing until it has watched a fortnight", () => {
    expect(learnedHour(build([17, 17, 17]), 18)).toBeNull();
    expect(learnedHour(build(Array(13).fill(17)), 18)).toBeNull();
    expect(learnedHour(build(Array(14).fill(17)), 18)).toBeCloseTo(17, 1);
  });

  it("says nothing when he turns up when he said he would", () => {
    expect(learnedHour(build(Array(20).fill(18)), 18)).toBeNull();
    expect(learnedHour(build(Array(20).fill(18.3)), 18)).toBeNull();
  });

  it("follows him when his hour moves, instead of staying anchored to the first month", () => {
    let h = build(Array(30).fill(18));
    expect(learnedHour(h, 18)).toBeNull();
    for (let day = 30; day < 60; day++) h = homingWith(h, 16, day) ?? h;
    expect(learnedHour(h, 18)).toBeLessThan(16.5);
  });

  it("keeps a whole number of days, so the count is a count", () => {
    const h = build([17, 18, 16, 17]);
    expect(h?.days).toBe(4);
    expect(h?.hour).toBeGreaterThan(16);
    expect(h?.hour).toBeLessThan(18);
  });
});
