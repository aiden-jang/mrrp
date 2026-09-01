import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SaidPanel } from "./screens.js";
import type { SaidSoFar } from "./types.js";

const text = (said: SaidSoFar, youAreHer: boolean) =>
  renderToStaticMarkup(<SaidPanel said={said} youAreHer={youAreHer} them="Bean" onClose={() => {}} />)
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&#x201C;|&#x201D;|&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

const AT = Date.parse("2026-04-02T12:00:00Z");

const room: SaidSoFar = {
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
    expect(text(room, false)).toContain("what you wrote her");
    expect(text(room, false)).toContain("Bean said back");
  });

  it("leaves out the other-lines heading when every line was an answer", () => {
    const only = text({ notes: room.notes, lines: [] }, true);
    expect(only).not.toContain("the rest of what");
    expect(only).toContain("it made me laugh");
  });
});
