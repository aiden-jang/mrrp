import { describe, expect, it } from "vitest";
import { catCallCode } from "./secrets.js";

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
