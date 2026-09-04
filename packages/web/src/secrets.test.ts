import { describe, expect, it } from "vitest";
import { catCallCode, typeLetter } from "./secrets.js";

describe("catCallCode", () => {
  it("lets a person type a cat's name without its spaces or punctuation", () => {
    expect(catCallCode("Miss Bean")).toBe("missbean");
    expect(catCallCode("Miso-Jr.")).toBe("misojr");
  });

  it("folds accented names onto keys an ordinary keyboard has", () => {
    expect(catCallCode("Chloé")).toBe("chloe");
  });

  it("does not turn a single letter or emoji into an accidental command", () => {
    expect(catCallCode("M")).toBeNull();
    expect(catCallCode("🐈")).toBeNull();
  });
});

const type = (word: string, nameCode: string | null = null) => {
  let buffer = "";
  const fired: (string | null)[] = [];
  for (const ch of word) {
    const r = typeLetter(buffer, ch, nameCode);
    buffer = r.buffer;
    fired.push(r.fired);
  }
  return { buffer, fired: fired.filter(Boolean) };
};

describe("typing at the room", () => {
  it("sets a code off on its last letter", () => {
    expect(type("yarn").fired).toEqual(["yarn"]);
    expect(type("pspsps").fired).toEqual(["summon"]);
  });

  it("ignores a code that is still half typed", () => {
    expect(type("yar").fired).toEqual([]);
    expect(type("bubble").fired).toEqual([]);
  });

  it("does not care what you typed in front of it", () => {
    expect(type("qqqqtreat").fired).toEqual(["treat"]);
  });

  it("clears the buffer so the same code fires again", () => {
    expect(type("boxbox").fired).toEqual(["box", "box"]);
  });

  it("does not grow while somebody leans on the keyboard", () => {
    expect(type("q".repeat(500)).buffer.length).toBeLessThanOrEqual(8);
  });

  it("keeps a buffer long enough to still hear her name", () => {
    const name = "clementinebean";
    expect(type("q".repeat(500), name).buffer.length).toBe(name.length);
  });

  it("lets her name beat a fixed code that ends the same way", () => {
    expect(type("box", "box").fired).toEqual(["herName"]);
    expect(type("box", null).fired).toEqual(["box"]);
  });

  it("hears a long name, which is longer than any fixed code", () => {
    const name = "clementinebean";
    expect(type(name, name).fired).toEqual(["herName"]);
  });

  it("takes what you type however you type it", () => {
    expect(type("YARN").fired).toEqual(["yarn"]);
  });
});
