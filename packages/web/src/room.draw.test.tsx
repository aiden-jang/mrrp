// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { room, SHELF_WOOD, type Room } from "./canvasHarness.js";
import { SHELF_TIP_MS } from "./shelftrip.js";
import { contrast } from "./legible.js";

const MUG = "#cfe0e4";
let r: Room | null = null;
afterEach(() => {
  r?.unmount();
  r = null;
});

describe("the room actually draws", () => {
  it("paints the cat, so every other assertion here means something", () => {
    r = room();
    r.frame(16);
    expect(r.furSpan(), "she is on screen").not.toBeNull();
  });

  it("keeps waxing and waning crescents the same size on the finer grid", () => {
    const crescent = (phase: number) => {
      const date = new Date(Date.UTC(2000, 0, 6, 18, 14) + (phase / 8) * 29.530588853 * 86_400_000);
      date.setUTCHours(23, 0, 0, 0);
      r = room({}, date.toISOString());
      r.frame(16);
      const area = r.count("#f4e6b8", 4, 24);
      r.unmount();
      r = null;
      return area;
    };
    const waxing = crescent(1);
    expect(waxing).toBeGreaterThan(0);
    expect(crescent(7)).toBe(waxing);
  });
});

describe("her trip to the shelf", () => {
  it("keeps the mug up while she walks, then puts it on the floor", () => {
    // The room says the mug is down from the start. She has not got there yet.
    r = room({ shelfDown: true, shelfAt: 1 });
    r.frame(16);
    expect(r.count(MUG, 56, 70), "not on the floor yet").toBe(0);

    r.run(32, SHELF_TIP_MS - 100);
    expect(r.count(MUG, 56, 70), "still not on the floor").toBe(0);

    r.run(SHELF_TIP_MS - 84, SHELF_TIP_MS + 100);
    expect(r.count(MUG, 56, 70), "over it goes").toBeGreaterThan(0);
  });

  it("walks from the door to the cabinet before knocking the mug down", () => {
    r = room({}, "2026-04-02T17:40:00Z");
    r.run(0, 400);
    const before = r.furSpan()!;

    r.set({ shelfDown: true, shelfAt: 1 });
    r.run(416, 416 + SHELF_TIP_MS);
    const after = r.furSpan()!;
    expect((after[0] + after[1]) / 2).toBeGreaterThan((before[0] + before[1]) / 2 + 3);
    expect(r.count(SHELF_WOOD, 40, 47, 20, 45), "the cabinet is beside her").toBeGreaterThan(0);
  });

  it("draws the mug on the floor with no trip at all", () => {
    // Opening a room where she knocked it off hours ago: no walk, the mug is simply down.
    r = room({ shelfDown: true });
    r.frame(16);
    expect(r.count(MUG, 56, 70)).toBeGreaterThan(0);
  });
});

describe("the marks his actions leave", () => {
  /*
   * Cells that clear 3:1 against the rug they lie on, counted rather than maxed.
   *
   * The maximum is no use: the dent has a lit lip that clears 3:1 whatever the dent itself is doing,
   * so "something here is legible" passes with the mark invisible. How much of it you can see is the
   * question, so count.
   */
  const legibleCells = (r: Room, y0: number, y1: number, x0: number, x1: number) => {
    const under = r.at(x0 - 1, y1)!;
    let n = 0;
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const c = r.at(x, y);
        if (c && c !== under && contrast(c, under) >= 3) n++;
      }
    return n;
  };

  it("draws a tuft big enough and dark enough to find", () => {
    r = room({ brushed: true });
    r.run(0, 300);
    // Five cells at 1.43:1 before this. Neither number was ever going to be seen.
    expect(legibleCells(r, 68, 76, 46, 56)).toBeGreaterThan(8);
  });

  it("shows the pet button on the cat, the same as holding on to her does", () => {
    // Petting leaves no mark, so the hold is the whole of it. The button used to fire neither half:
    // nothing on his cat, nothing on hers. Her eyes close while she is being petted.
    // The heart that rises off her, which is drawn only while she is being petted.
    const hearts = (rm: Room) => {
      let n = 0;
      for (let y = 30; y < 70; y++)
        for (let x = 0; x < 80; x++) if (rm.at(x, y)?.startsWith("rgba(232,120,140")) n++;
      return n;
    };
    r = room();
    r.run(0, 400);
    expect(hearts(r), "not being petted").toBe(0);

    r.set({ petAt: 1 });
    r.run(416, 900);
    expect(hearts(r), "a tap of the button reaches the drawing").toBeGreaterThan(0);
  });

  it.each(["rose", "moss", "honey", "dusk", "cream"] as const)(
    "keeps what he left out visible on the %s bed",
    (key) => {
      r = room({ blanket: { key, stripe: false } });
      r.run(0, 300);
      const before = new Map<string, string>();
      for (let y = 68; y <= 76; y++) for (let x = 22; x <= 32; x++) before.set(`${x},${y}`, r.at(x, y)!);
      r.set({ brought: true });
      r.frame(316);
      let visible = 0;
      for (let y = 68; y <= 76; y++) {
        for (let x = 22; x <= 32; x++) {
          const under = before.get(`${x},${y}`)!;
          const after = r.at(x, y)!;
          if (under !== after && contrast(under, after) >= 3) visible++;
        }
      }
      expect(visible).toBeGreaterThan(3);
    },
  );

  it("draws a dent that is not the same colour as the rug it is in", () => {
    r = room({ satWith: true });
    r.run(0, 300);
    // The body is about 22 cells. The lip alone is 9, so this cannot pass on the lip.
    expect(legibleCells(r, 68, 74, 34, 47)).toBeGreaterThan(14);
  });
});

describe("the box's near wall", () => {
  it("does not cover the mug she knocked off", () => {
    r = room({ shelfDown: true, boxOut: true });
    r.frame(16);
    // This is the bug that took three reports to find: the box is drawn over x 44-71 at floor
    // level and the mug lands at 66, so drawn in the wrong order it vanishes underneath.
    expect(r.count(MUG, 56, 70), "mug visible with a box out").toBeGreaterThan(0);
  });

  it("does not cover her mood while she is sitting in it", () => {
    const stressedMat = "#b68486";
    r = room({ boxOut: true, box: true, mood: "stressed" });
    // Long enough for her to have eased all the way into it: her mood props ride at kx +- 13, so
    // they only land inside the box once she is actually sitting in it.
    r.run(16, 1400);
    // Twenty, not one. Three cells of the mat peek past the box whichever order they are drawn in,
    // so "greater than zero" passes with her mood entirely hidden.
    expect(r.count(stressedMat, 55, 75), "her mood survives the box").toBeGreaterThan(20);
  });
});

describe("noticing their arrival", () => {
  it("looks up before the slow blink, then opens her eyes again", () => {
    r = room({ together: false });
    r.set({ together: true, watchDoorAt: 1 });
    r.run(16, 2000);
    expect(r.count("#7cb342", 44, 67), "awake while looking toward the door").toBeGreaterThan(0);
    r.run(2016, 2600);
    expect(r.count("#7cb342", 44, 67), "slow blink after the glance").toBe(0);
    r.frame(3300);
    expect(r.count("#7cb342", 44, 67), "back to the room").toBeGreaterThan(0);
  });
});

describe("her round eyes in the living room", () => {
  it("winks with one iris, then restores both round eyes", () => {
    r = room({ mood: "horny" });
    r.run(0, 2400);
    expect(r.count("#7cb342", 30, 70)).toBe(4);
    r.frame(2700);
    expect(r.count("#7cb342", 30, 70)).toBe(2);
    r.frame(3100);
    expect(r.count("#7cb342", 30, 70)).toBe(4);
  });

  it.each(["good", "tired"] as const)("keeps the %s blink timing and reopens both eyes", (mood) => {
    r = room({ mood, together: true });
    r.frame(3450);
    expect(r.count("#7cb342", 30, 70)).toBe(0);
    r.frame(3650);
    expect(r.count("#7cb342", 30, 70)).toBe(mood === "tired" ? 0 : 4);
    r.frame(3900);
    expect(r.count("#7cb342", 30, 70)).toBe(4);
  });

  it("keeps both eyes open when an interaction overrides the flirty wink", () => {
    r = room({ mood: "horny", eyesOpen: true });
    r.frame(2700);
    expect(r.count("#7cb342", 30, 70)).toBe(4);
  });

  it("skips animated blinks and winks with reduced motion", () => {
    r = room({ mood: "horny" }, undefined, true);
    for (const at of [2700, 3450, 4150]) {
      r.frame(at);
      expect(r.count("#7cb342", 30, 70)).toBe(4);
    }
  });
});
