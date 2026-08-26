import { describe, expect, it } from "vitest";
import {
  milestoneFor,
  personalityFrom,
  roomStartedAt,
  tallyFrom,
  TRAIT_MIN_DAYS,
  TRAIT_MINIMUM,
  TRAIT_SHARE,
} from "./remembers.js";

/* Mostly about restraint: a personality on day two is a character sheet, one that changes weekly is a
 * readout, and an anniversary in the server's timezone lands on the wrong evening for half the planet. */

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
    // Turning one on day zero would be the room congratulating itself for existing.
    expect(milestoneFor(AT("2026-08-12T15:00:00Z"), AT("2026-08-12T18:00:00Z"), tz)).toBeNull();
  });

  /*
   * Both instants are "the 13th" in UTC and only one is her anniversary, so a server reading its own date
   * gets the first wrong. Cannot be shown by varying the zone instead: the start is read in the same zone,
   * so both sides shift together and a Tokyo room genuinely has a different birthday.
   */
  it("answers in her timezone, not the server's", () => {
    const started = AT("2025-08-12T15:00:00Z"); // 11:00 on the 12th in New York
    const herEveningOfThe12th = AT("2026-08-13T01:00:00Z");
    const herEarlyThe13th = AT("2026-08-13T05:00:00Z");

    expect(milestoneFor(started, herEveningOfThe12th, "America/New_York")?.years).toBe(1);
    expect(milestoneFor(started, herEarlyThe13th, "America/New_York")).toBeNull();
  });

  it("gives a 29 February room its day in a common year", () => {
    // Otherwise it waits three years, which nobody experiences as correctness.
    const found = milestoneFor(AT("2024-02-29T15:00:00Z"), AT("2027-03-01T15:00:00Z"), tz);
    expect(found).toEqual({ kind: "anniversary", years: 3 });
  });

  it("keeps 29 February on the 29th when there is one", () => {
    expect(milestoneFor(AT("2024-02-29T15:00:00Z"), AT("2028-02-29T15:00:00Z"), tz)?.years).toBe(4);
    // And does not also fire on 1 March that year.
    expect(milestoneFor(AT("2024-02-29T15:00:00Z"), AT("2028-03-01T15:00:00Z"), tz)).toBeNull();
  });

  it("marks the first week and the first month, exactly once each", () => {
    const start = AT("2026-08-01T15:00:00Z");
    expect(milestoneFor(start, start + 7 * DAY, tz)?.kind).toBe("first-week");
    expect(milestoneFor(start, start + 30 * DAY, tz)?.kind).toBe("first-month");
    // Not for the days either side, or it becomes wallpaper.
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
    // Zero would make the room 56 years old and fire an anniversary check on a room with nobody in it.
    expect(roomStartedAt([], now)).toBe(now);
    expect(milestoneFor(roomStartedAt([], now), now, "America/New_York")).toBeNull();
  });

  it("ignores a timestamp that is not one", () => {
    // Storage is old and hand-migrated in places; one undefined firstSeen must not make the room NaN days
    // old, because every comparison against NaN is false and the room would simply stop having a birthday.
    const real = AT("2025-03-04T10:00:00Z");
    expect(roomStartedAt([NaN, real], now)).toBe(real);
    expect(roomStartedAt([NaN], now)).toBe(now);
  });
});

describe("what she comes to expect", () => {
  /** Long enough that the age gate is not what these tests are measuring. */
  const SETTLED = TRAIT_MIN_DAYS + 60;

  // Petting her is a button, so twelve is an afternoon rather than a month. The count cannot stand in
  // for elapsed time; only the room's age can.
  it("has no personality on the day the room is made, however much happens in it", () => {
    expect(personalityFrom({ pet: 50 }, 0)).toBeNull();
    expect(personalityFrom({ pet: 50 }, TRAIT_MIN_DAYS - 1)).toBeNull();
    expect(personalityFrom({ pet: 50 }, TRAIT_MIN_DAYS)?.trait).toBe("petted");
  });

  it("still needs the count once the room is old enough", () => {
    // Both gates, because a quiet fortnight is not a personality either.
    expect(personalityFrom({ pet: 3 }, SETTLED)).toBeNull();
  });

  it("stays silent rather than guessing when the room's age is not a number", () => {
    // A hand-migrated `firstSeen` gives NaN days, and `NaN < 14` is false: the naive comparison would let
    // a broken timestamp through as a personality instead of holding it back.
    expect(personalityFrom({ pet: 50 }, NaN)).toBeNull();
  });

  it("has no personality early on", () => {
    // A cat with a trait on day two is a character sheet.
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

  // Without this the trait flips whenever the leader changes by one, which is a readout.
  it("stays silent when nothing really dominates", () => {
    // A clear leader and still not enough of one, so this isolates the share threshold rather than
    // leaning on the tie check below: 5 of 17 is the shape of somebody who does a bit of everything.
    const spread = { pet: 5, brush: 4, sit: 4, bring: 4 };
    expect(5 / 17).toBeLessThan(TRAIT_SHARE);
    expect(personalityFrom(spread, SETTLED)).toBeNull();
  });

  it("stays silent on a tie", () => {
    // Picking one would mean picking whichever the sort happened to put first, and swapping next visit.
    expect(personalityFrom({ pet: 8, brush: 8 }, SETTLED)).toBeNull();
  });

  it("does not flip on a single visit", () => {
    expect(personalityFrom({ sit: 20, pet: 4 }, SETTLED)?.trait).toBe("accompanied");
    // One more of something else must not change who she is.
    expect(personalityFrom({ sit: 20, pet: 4, photo: 1 }, SETTLED)?.trait).toBe("accompanied");
  });

  it("has nothing to say about an empty room", () => {
    expect(personalityFrom({}, SETTLED)).toBeNull();
  });

  // The log keeps forty visits, so counting it directly lets the trait drift. The eightieth pet still
  // counts once the first forty are trimmed.
  it("keeps counting past the length of the visit log", () => {
    const seeded = tallyFrom(
      Array.from({ length: 40 }, (_, i) => ({ at: i, who: "him", action: "sit" as const })),
    );
    expect(seeded).toEqual({ sit: 40 });
    const later = { ...seeded, sit: seeded.sit! + 40, photo: 6 };
    expect(personalityFrom(later, SETTLED)?.count).toBe(80);
  });
});
