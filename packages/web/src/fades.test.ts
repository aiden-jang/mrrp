import { describe, expect, it } from "vitest";
import { fadeNote, listOf, untilMidnight } from "./fades.js";
import type { RoomView } from "./types.js";

const view = (over: Partial<RoomView>): RoomView =>
  ({
    clock: { tz: "UTC", homeHour: 18 },
    brushed: false,
    satWith: false,
    framed: false,
    boxOut: false,
    box: false,
    shelfDown: false,
    forHer: null,
    ...over,
  }) as RoomView;

// 09:00 UTC on an arbitrary day. Fifteen hours of her day left.
const NINE_AM = Date.UTC(2026, 0, 15, 9, 0, 0);

describe("saying when things go", () => {
  it("counts down to her midnight, not the reader's", () => {
    expect(untilMidnight("UTC", NINE_AM)).toBeCloseTo(15, 5);
    // Same instant, her clock 14 hours ahead: 23:00 for her, so her day is nearly over while his
    // has barely started. This is the whole reason his side has to name whose midnight it means.
    expect(untilMidnight("Pacific/Kiritimati", NINE_AM)).toBeCloseTo(1, 5);
  });

  it("names her clock on his side, because his midnight is not the one that clears the room", () => {
    const note = fadeNote(view({ brushed: true }), "him", NINE_AM);
    expect(note).toContain("where she is");
    expect(note).toContain("in about 15 hours");
  });

  it("agrees with the verb about how many things it is talking about", () => {
    expect(fadeNote(view({ brushed: true }), "him", NINE_AM)).toContain("the tuft goes at midnight");
    expect(fadeNote(view({ brushed: true, satWith: true }), "him", NINE_AM)).toContain(
      "the tuft and the dent go at midnight",
    );
  });

  it("keeps the three lifetimes apart", () => {
    const note = fadeNote(view({ brushed: true, framed: true, forHer: "yarn" }), "him", NINE_AM)!;
    expect(note).toContain("the tuft goes at midnight");
    expect(note).toContain("The picture stays up.");
    expect(note).toContain("waits until she finds it");
  });

  it("tells her the mug is hers to leave, and the box is not", () => {
    expect(fadeNote(view({ shelfDown: true }), "her", NINE_AM)).toBe(
      "The mug stays on the floor until one of you puts it back.",
    );
    expect(fadeNote(view({ box: true }), "her", NINE_AM)).toContain("The box goes at midnight");
  });

  it("says nothing when there is nothing in the room", () => {
    expect(fadeNote(view({}), "him", NINE_AM)).toBeNull();
    expect(fadeNote(view({}), "her", NINE_AM)).toBeNull();
  });

  it("does not promise hours it cannot deliver near midnight", () => {
    const late = Date.UTC(2026, 0, 15, 23, 30, 0);
    expect(fadeNote(view({ brushed: true }), "him", late)).toContain("in under an hour");
  });

  it("joins a list without a stray comma", () => {
    expect(listOf(["a", false, "b", null, "c"])).toBe("a, b and c");
    expect(listOf(["only"])).toBe("only");
    expect(listOf([false, null])).toBeNull();
  });
});
