import { describe, expect, it } from "vitest";
import { heard } from "./heard.js";

describe("hearing the other one do something", () => {
  it("says nothing on the first view, however recent what they did was", () => {
    // Opening the room would otherwise purr at you for a pet from an hour ago.
    expect(heard(null, Date.now(), "pet")).toBe(false);
  });

  it("fires on a newer action and not on the same one arriving again", () => {
    expect(heard(1_000, 2_000, "pet")).toBe("purr");
    expect(heard(2_000, 2_000, "pet")).toBe(false);
    expect(heard(2_000, 1_000, "pet")).toBe(false);
  });

  it("gives a pet the same purr their own tap makes", () => {
    expect(heard(1, 2, "pet")).toBe("purr");
    expect(heard(1, 2, "brush")).toBe("brush");
    expect(heard(1, 2, "shelf")).toBe("thump");
  });

  it("still bounces for an action with no cue of its own", () => {
    // null is "no sound, but it happened". false is "nothing happened".
    expect(heard(1, 2, "photo")).toBe("shutter");
    expect(heard(1, 2, null)).toBe(null);
    expect(heard(1, null, "pet")).toBe(false);
  });
});
