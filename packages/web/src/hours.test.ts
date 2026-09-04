import { describe, expect, it } from "vitest";
import { sceneFor } from "./hours.js";

/* UTC so the hour in the test is the hour in the room, and the fifteenth so the season is settled. */
const clock = { tz: "UTC", homeHour: 18 };
const at = (month: string, hour: number) =>
  Date.parse(`2026-${month}-15T${String(hour).padStart(2, "0")}:30:00Z`);
const doing = (month: string, hour: number) => sceneFor(clock, at(month, hour)).doing;
/* Cloud, not rain or snow: those two have her at the window watching, which is said before this. */
const greyDoing = (month: string, hour: number) =>
  sceneFor(clock, at(month, hour), null, false, null, "cloud").doing;

describe("what she is doing", () => {
  it("walks the day from asleep to asleep again", () => {
    expect(doing("01", 0)).toBe("asleep, and dreaming about something");
    expect(doing("01", 6)).toBe("awake before anyone, watching the window");
    expect(doing("01", 8)).toBe("in the first bit of sun");
    expect(doing("01", 12)).toBe("loafing");
    expect(doing("01", 14), "the afternoon nap").toBe("deeply asleep in the best spot in the room");
    expect(doing("01", 19)).toBe("settled, now that everyone's in");
    expect(doing("01", 22)).toBe("curled up for the night");
  });

  it("has her at the door in the hour before he is due", () => {
    // Ahead of homeHour, and it wins over whatever the hour would otherwise have her doing.
    expect(doing("01", 17)).toBe("waiting by the door");
  });

  it("naps out of the sun in summer and in it the rest of the year", () => {
    expect(doing("07", 14)).toBe("asleep on the cool boards, out of the sun");
    expect(doing("01", 14)).toBe("deeply asleep in the best spot in the room");
  });

  it("gives up on the sun on a grey day", () => {
    expect(greyDoing("01", 14), "the nap, with no best spot to take").toBe(
      "asleep on the rug, with nothing to move for",
    );
    expect(greyDoing("01", 16), "the afternoon, with no beam to follow").toBe(
      "in the usual spot, with no sun to follow",
    );
  });

  it("says something different every few hours, so the room never reads stuck", () => {
    const said = new Set([0, 3, 6, 9, 12, 15, 19, 22].map((h) => doing("01", h)));
    expect(said.size).toBeGreaterThan(4);
  });
});
