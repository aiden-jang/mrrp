import { describe, expect, it } from "vitest";
import hours from "./hours.ts?raw";
import moods from "./moods.ts?raw";
import dreams from "./dreams.ts?raw";

/*
 * Every scene description is read in two frames.
 *
 * His side renders "<her name> is ___." and hers renders "You are ___.", so a phrase carrying a
 * third-person pronoun works in one and falls over in the other. Three did, and all three arrived
 * with the change that introduced the second frame rather than with the strings themselves: nobody
 * goes back over the copy after changing the sentence around it.
 */
const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** Everything that can land in "<name> is ___." on his side. */
const his = (src: string) => [
  ...[...strip(src).matchAll(/\bdoing:\s*"([^"]+)"/g)].map((m) => m[1]!),
  ...[...strip(src).matchAll(/return\s*"([^"]{6,})"/g)].map((m) => m[1]!),
  ...[...strip(src).matchAll(/\?\s*"([^"]{6,})"\s*:\s*"([^"]{6,})"/g)].flatMap((m) => [m[1]!, m[2]!]),
];

/** The override she reads instead, where there is one. */
const hers = (src: string) =>
  Object.fromEntries(
    [...strip(src).matchAll(/\bdoing: "([^"]+)",\s*\n\s*doingHers: "([^"]+)"/g)].map((m) => [m[1]!, m[2]!]),
  );

/*
 * Both seats watch the same sleeping cat, and one of them is her, so a dream naming a third person
 * was the room narrating her own sleep back to her. Ten of nineteen did.
 */
describe("what she is dreaming about", () => {
  it("belongs to whoever is watching", () => {
    const lines = [...strip(dreams).matchAll(/line:\s*"([^"]+)"/g)].map((m) => m[1]!);
    expect(lines.length, "found no dream lines").toBeGreaterThan(10);
    expect(lines.filter((l) => /\b(she|her|hers)\b/i.test(l))).toEqual([]);
  });
});

describe("what the room says she is doing", () => {
  const all = [...his(hours), ...his(moods)];
  const override = { ...hers(hours), ...hers(moods) };
  const read = (p: string) => override[p] ?? p;

  it("has something to check", () => {
    expect(all.length).toBeGreaterThan(10);
  });

  it("never puts a third person in the sentence she reads about herself", () => {
    const broken = all.filter((p) => /\b(she|her|hers)\b/i.test(read(p)));
    expect(broken.map((p) => `"You are ${read(p)}."`)).toEqual([]);
  });

  it("never tells her she is doing something to herself", () => {
    // "sitting on you" is fine when he is reading it and nonsense when she is.
    const broken = all.filter((p) => /\byou\b/i.test(read(p)) && !override[p]);
    expect(broken.map((p) => `"You are ${p}."`)).toEqual([]);
  });
});
