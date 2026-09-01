import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { plain } from "./rendered.js";
import { SaidPanel } from "./screens.js";
import type { SaidSoFar } from "./types.js";

const text = (said: SaidSoFar, youAreHer: boolean) =>
  plain(renderToStaticMarkup(<SaidPanel said={said} youAreHer={youAreHer} them="Bean" onClose={() => {}} />));

const AT = Date.parse("2026-04-02T12:00:00Z");

const room: SaidSoFar = {
  total: 2,
  notes: [
    { day: 1, text: "you always take the long way home", answers: [] },
    { day: 2, text: "the good mug is yours now", answers: [{ text: "it made me laugh", at: AT }] },
  ],
  lines: [{ text: "he was on the window", at: AT, gift: "moth" }],
};

describe("looking back at what they have said", () => {
  it("keeps the notes in the order the room handed them over", () => {
    const said = text(room, true);
    expect(said.indexOf("long way home")).toBeLessThan(said.indexOf("good mug"));
    expect(said).toContain("day 1");
    expect(said).toContain("day 2");
  });

  it("puts her answer under the note it answers, not at the end", () => {
    const said = text(room, true);
    expect(said.indexOf("it made me laugh")).toBeGreaterThan(said.indexOf("good mug"));
    expect(said.indexOf("it made me laugh")).toBeLessThan(said.indexOf("he was on the window"));
  });

  it("says whose words these are, from each seat", () => {
    expect(text(room, true)).toContain("what he's written you");
    // His name is a placeholder until he picks one, so her side never prints it.
    expect(text(room, true)).not.toContain("Bean has written");
    expect(text(room, true)).toContain("you said back");
    // Not "what you wrote her": this stops where she has got to, and he may have written far more.
    expect(text(room, false)).toContain("what she has read so far");
    expect(text(room, false)).not.toContain("what you wrote her");
    expect(text(room, false)).toContain("Bean said back");
  });

  it("says what she was answering when he has rewritten that note since", () => {
    const orphan = text(
      {
        total: 1,
        notes: [{ day: 1, text: "I am selling the car", answers: [] }],
        lines: [{ text: "it made me laugh", at: AT, about: "the good mug is yours now" }],
      },
      false,
    );
    expect(orphan).toContain('answering "the good mug is yours now"');
    expect(orphan.indexOf("good mug")).toBeLessThan(orphan.indexOf("it made me laugh"));
  });

  it("tells her how many he wrote, once there are more than she has had", () => {
    const early = { total: 100, notes: [room.notes[0]!], lines: [] };
    expect(text(early, true)).toContain("He wrote 100 of these.");
    expect(text(early, false)).toContain("100 written. She is on day 1.");
  });

  it("marks the end once she has had all of them, instead of going quiet", () => {
    const done = { total: room.notes.length, notes: room.notes, lines: [] };
    expect(text(done, true)).toContain("That is all of them. He wrote 2.");
    expect(text(done, true)).not.toContain("of these");
    expect(text(done, false)).toContain("She has read all of them. All 2.");
  });

  it("does not say he wrote one, when one is all he wrote", () => {
    const one = { total: 1, notes: [room.notes[0]!], lines: [] };
    expect(text(one, true)).toContain("That is all of them.");
    expect(text(one, true)).not.toContain("He wrote 1");
  });

  it("remembers the thing her words came with", () => {
    expect(text(room, false)).toContain("with a moth");
  });

  it("writes the date once for a run of things said the same day", () => {
    const sameDay = text(
      {
        total: 0,
        notes: [],
        lines: [
          { text: "one", at: AT },
          { text: "two", at: AT + 60_000 },
        ],
      },
      true,
    );
    expect(sameDay.match(/April 2/g)).toHaveLength(1);
  });

  it("leaves out the other-lines heading when every line was an answer", () => {
    const only = text({ total: 2, notes: room.notes, lines: [] }, true);
    expect(only).not.toContain("the rest of what");
    expect(only).toContain("it made me laugh");
  });
});
