import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { plain } from "./rendered.js";
import { ArrivalCard } from "./RoomArrival.js";
import type { Arrival } from "./types.js";

const text = (items: Arrival[]) =>
  plain(renderToStaticMarkup(<ArrivalCard name="Bean" items={items} youAreHer={false} onClose={() => {}} />));

const AT = Date.now();

describe("the things she said, on the card he opens", () => {
  it("shows a line on its own as a line", () => {
    expect(text([{ kind: "line", at: AT, text: "I read the one about the bus" }])).toContain(
      'Bean left: "I read the one about the bus"',
    );
  });

  it("names the thing she left when her words came with one", () => {
    const said = text([{ kind: "line", at: AT, text: "he was on the window", gift: "moth" }]);
    expect(said).toContain("left you a moth");
    expect(said).toContain('"he was on the window"');
  });

  it("puts his own note above her answer, so it reads as a pair", () => {
    const said = text([
      { kind: "line", at: AT, text: "it made me laugh", note: "you always take the long way home" },
    ]);
    expect(said).toContain("Bean answered you");
    expect(said.indexOf("long way home")).toBeLessThan(said.indexOf("it made me laugh"));
  });

  it("keeps every one of them, so a week away is a week of them", () => {
    const said = text([
      { kind: "line", at: AT, text: "second" },
      { kind: "line", at: AT - 1000, text: "first" },
    ]);
    expect(said).toContain("second");
    expect(said).toContain("first");
  });
});
