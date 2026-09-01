import { describe, expect, it } from "vitest";
import * as served from "../../worker/src/types.js";
import * as read from "./types.js";

/*
 * The lists the two sides both hold. `wire.check.ts` covers the shapes; `tsc` cannot see values,
 * and a value is what breaks here: the browser offers a mood the worker does not accept, the POST
 * comes back 400, the client swallows it, and the button does nothing for the rest of time.
 */
describe("the lists both sides keep their own copy of", () => {
  it("offers exactly the moods the worker will take", () => {
    expect(read.MOODS.map((m) => m.id)).toEqual(served.MOODS.map((m) => m.id));
  });

  it("offers exactly the treats, actions and cat acts the worker will take", () => {
    expect(read.TREATS.map((t) => t.id)).toEqual(served.TREATS.map((t) => t.id));
    expect(read.ACTIONS.map((a) => a.id)).toEqual(served.ACTIONS.map((a) => a.id));
    expect(read.CAT_ACTS.map((a) => a.id)).toEqual(served.CAT_ACTS.map((a) => a.id));
    expect(read.GIFTS.map((g) => g.id)).toEqual(served.GIFTS.map((g) => g.id));
  });

  it("agrees how much of his notes the room keeps", () => {
    // The panel counts what will survive, so if these ever disagree it counts wrong and he is told
    // a number of notes that is not the number he gets.
    expect(read.NOTE_MAX).toBe(served.NOTE_MAX);
    expect(read.NOTES_KEPT).toBe(served.NOTES_KEPT);
  });

  it("agrees how much she can say in one go", () => {
    // The browser stops her typing past it; the worker cuts anything longer. If the browser's grew,
    // she would type a hundred and sixty characters and lose twenty without being told.
    expect(read.LINE_MAX).toBe(served.LINE_MAX);
  });

  it("says the same words about them, so one side is not quietly nicer than the other", () => {
    expect(read.MOODS).toEqual(served.MOODS);
    expect(read.TREATS).toEqual(served.TREATS);
    expect(read.GIFTS).toEqual(served.GIFTS);
  });
});
