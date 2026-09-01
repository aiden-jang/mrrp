import { describe, expect, it } from "vitest";
import app from "./App.tsx?raw";
import screens from "./screens.tsx?raw";
import moods from "./moods.ts?raw";
import dreams from "./dreams.ts?raw";
import { NOTES } from "../../worker/src/notes.js";

/*
 * The one sentence the whole app turns on: she is the cat, she does not have one.
 *
 * It has been re-established twice now, and both times something was left behind saying the old
 * thing. Most recently the very first screen she ever opens, which still read "someone made you a
 * cat" months after the model changed, because nobody who worked on it ever saw that screen.
 */
/* Comments are allowed to name the old sentence; they are how anybody knows not to write it again. */
const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/*
 * Every file that holds a sentence she can read, not just App.tsx.
 *
 * This guard watched one file while the copy moved into others. The screens the two of them see
 * when somebody leaves, and the panel of everything they have said, were never checked.
 */
const copy = [app, screens, moods, dreams].map(strip).join("\n");

describe("she is the cat", () => {
  it("never tells her somebody gave her one", () => {
    expect(copy).not.toMatch(/made you a cat/i);
    expect(NOTES.join(" ")).not.toMatch(/made you a cat/i);
  });

  it("never gives anybody a cat to own", () => {
    // The old model in its other form: not "somebody made you one" but "here is yours".
    for (const said of [copy, NOTES.join(" ")]) {
      expect(said).not.toMatch(/\byour cat\b/i);
      expect(said).not.toMatch(/\bher cat\b/i);
      expect(said).not.toMatch(/\bcat of (your|her) own\b/i);
    }
  });

  it("never says the cat's name back to her as if she were somebody else", () => {
    /*
     * The rule, not the expression. This asserted the exact template once and failed the day the
     * caption got better rather than the day it got worse, which is the wrong way round.
     */
    expect(copy).toMatch(/youAreHer\s*\?\s*`You are \$\{[^}]+\}\.`/);
  });
});
