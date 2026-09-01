import { describe, expect, it } from "vitest";
import app from "./App.tsx?raw";
import { NOTES } from "../../worker/src/notes.js";

/*
 * The one sentence the whole app turns on: she is the cat, she does not have one.
 *
 * It has been re-established twice now, and both times something was left behind saying the old
 * thing. Most recently the very first screen she ever opens, which still read "someone made you a
 * cat" months after the model changed, because nobody who worked on it ever saw that screen.
 */
/* Comments are allowed to name the old sentence; they are how anybody knows not to write it again. */
const copy = app.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("she is the cat", () => {
  it("never tells her somebody gave her one", () => {
    expect(copy).not.toMatch(/made you a cat/i);
    expect(NOTES.join(" ")).not.toMatch(/made you a cat/i);
  });

  it("never says the cat's name back to her as if she were somebody else", () => {
    /*
     * The rule, not the expression. This asserted the exact template once and failed the day the
     * caption got better rather than the day it got worse, which is the wrong way round.
     */
    expect(copy).toMatch(/youAreHer\s*\?\s*`You are \$\{[^}]+\}\.`/);
  });
});
