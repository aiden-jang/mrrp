import { describe, expect, it } from "vitest";
import { SHELF_TIP_MS, SHELF_TRIP_MS, shelfTrip } from "./shelftrip.js";

const at = (age: number, prev = age - 16) => shelfTrip(age, prev);

describe("her trip to the shelf", () => {
  it("holds the mug up until she has walked there", () => {
    expect(at(0).mugStillUp).toBe(true);
    expect(at(SHELF_TIP_MS - 1).mugStillUp).toBe(true);
    expect(at(SHELF_TIP_MS).mugStillUp).toBe(false);
  });

  it("tips it on exactly one frame, however slow the frames are", () => {
    expect(at(SHELF_TIP_MS).tips).toBe(true);
    // The next frame, whenever it lands, must not thump again.
    expect(at(SHELF_TIP_MS + 16, SHELF_TIP_MS).tips).toBe(false);
    expect(at(SHELF_TIP_MS + 900, SHELF_TIP_MS + 400).tips).toBe(false);
    // A frame rate so bad it steps clean over the moment still tips, once.
    expect(shelfTrip(SHELF_TIP_MS + 800, SHELF_TIP_MS - 800).tips).toBe(true);
  });

  it("reaches up around the moment it goes over, not on arrival", () => {
    expect(at(200).reaching).toBe(false);
    expect(at(SHELF_TIP_MS - 200).reaching).toBe(true);
    expect(at(SHELF_TIP_MS + 100).reaching).toBe(true);
    expect(at(SHELF_TIP_MS + 600).reaching).toBe(false);
  });

  it("is over when it is over, and is not running before it starts", () => {
    expect(at(SHELF_TRIP_MS - 1).going).toBe(true);
    expect(at(SHELF_TRIP_MS).going).toBe(false);
    // A room opened with the mug already down is not a trip: age is hugely negative.
    expect(at(-1e9).going).toBe(false);
    expect(at(-1e9).mugStillUp).toBe(false);
    expect(at(-1e9).tips).toBe(false);
  });
});
