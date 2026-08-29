import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GoneCard, LeftCard, TheyLeftNotice } from "./screens.js";

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const APRIL_2 = Date.parse("2026-04-02T12:00:00Z");
const noop = () => {};

const gone = (undoUntil: number | null, over: Partial<{ undoing: boolean; err: string | null }> = {}) =>
  renderToStaticMarkup(
    <GoneCard
      undoUntil={undoUntil}
      undoing={over.undoing ?? false}
      err={over.err ?? null}
      onPutBack={noop}
      onHome={noop}
    />,
  );

const left = (
  over: Partial<{
    undoUntil: number | null;
    theyWereTold: string | null;
    seatFree: boolean;
    undoing: boolean;
    err: string | null;
  }> = {},
) =>
  renderToStaticMarkup(
    <LeftCard
      catName="Bean"
      undoUntil={over.undoUntil ?? null}
      theyWereTold={over.theyWereTold ?? null}
      seatFree={over.seatFree ?? false}
      undoing={over.undoing ?? false}
      err={over.err ?? null}
      onPutBack={noop}
      onStartFresh={noop}
    />,
  );

describe("a room that has been deleted", () => {
  it("offers no way back to the person who cannot take one", () => {
    const html = gone(null);
    expect(text(html)).toContain("this room is gone");
    expect(html).not.toContain("Put the room back");
    expect(text(html)).toContain("There is nothing left in here to get back");
  });

  it("gives the one who deleted it the date it stops being possible", () => {
    const html = gone(APRIL_2);
    expect(text(html)).toContain("you deleted this room");
    expect(text(html)).toContain("April 2");
    expect(html).toContain("Put the room back");
  });

  it("does not promise it is still there: it is gone for both of them already", () => {
    expect(text(gone(APRIL_2))).toContain("It is gone for both of you already");
  });

  it("holds the button while the undo is in flight", () => {
    expect(gone(APRIL_2, { undoing: true })).toContain("disabled");
    expect(gone(APRIL_2, { undoing: false })).not.toContain("disabled");
  });

  it("puts a failure next to the button that failed", () => {
    const html = gone(APRIL_2, { err: "The week is up." });
    expect(text(html)).toContain("The week is up.");
    expect(html).toContain('role="status"');
  });
});

describe("a room she has left", () => {
  it("offers her side back while it is still kept", () => {
    const html = left({ undoUntil: APRIL_2 });
    expect(text(html)).toContain("It is kept until April 2");
    expect(html).toContain("Put my side back");
  });

  it("tells her he knows, by name", () => {
    expect(text(left({ undoUntil: APRIL_2, theyWereTold: "Aiden" }))).toContain(
      "Aiden has been told the same thing",
    );
  });

  it("says nothing about him when there is nothing to say", () => {
    expect(text(left({ undoUntil: APRIL_2 }))).not.toContain("has been told");
  });

  it("offers a fresh start only when there is a seat to take", () => {
    expect(left({ seatFree: true })).toContain("Take the seat again");
    expect(left({ seatFree: false })).not.toContain("Take the seat again");
  });

  it("says the seat is gone rather than hedging about it", () => {
    expect(text(left({ seatFree: false }))).toContain("Somebody else is the cat now");
    expect(text(left({ seatFree: true }))).toContain("Bean is still in there and the seat is empty");
  });

  it("offers both doors while her side is still kept", () => {
    const html = left({ undoUntil: APRIL_2, seatFree: true });
    expect(html).toContain("Put my side back");
    expect(html).toContain("No, start fresh instead");
  });
});

describe("what he is told while she can still come back", () => {
  it("names her and the date, where nobody-is-here-yet would have been", () => {
    const html = TheyLeftNotice({ name: "Sofia", until: APRIL_2 });
    const out = text(renderToStaticMarkup(html));
    expect(out).toContain("Sofia left this room");
    expect(out).toContain("kept until April 2");
  });

  it("says what sending the link on would cost", () => {
    const out = text(renderToStaticMarkup(TheyLeftNotice({ name: "Sofia", until: APRIL_2 })));
    expect(out).toContain("gives the seat away, and that ends it");
  });
});
