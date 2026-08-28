// @vitest-environment jsdom
//
// The only file in this package that needs a DOM, so it asks for one here rather than in the config.
// Everything else renders to static markup and stays fast; loading jsdom for all of them would cost
// every test in the package for the benefit of this one.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GoneCard, LeftCard } from "./screens.js";

afterEach(cleanup);

const APRIL_2 = Date.parse("2026-04-02T12:00:00Z");

/*
 * Which button does which thing.
 *
 * Static markup cannot see this, and it is the half worth checking: "Put my side back" and "start
 * fresh instead" sit next to each other, take the same shape of callback, and one restores her year
 * while the other throws it away. Swapping them is invisible in a screenshot and in the HTML.
 */
describe("the buttons on a deleted room", () => {
  it("puts the room back, and does not send him home instead", () => {
    const onPutBack = vi.fn();
    const onHome = vi.fn();
    render(<GoneCard undoUntil={APRIL_2} undoing={false} err={null} onPutBack={onPutBack} onHome={onHome} />);

    fireEvent.click(screen.getByRole("button", { name: "Put the room back" }));
    expect(onPutBack).toHaveBeenCalledOnce();
    expect(onHome).not.toHaveBeenCalled();
  });

  it("takes him at his word when he says he meant it", () => {
    const onPutBack = vi.fn();
    const onHome = vi.fn();
    render(<GoneCard undoUntil={APRIL_2} undoing={false} err={null} onPutBack={onPutBack} onHome={onHome} />);

    fireEvent.click(screen.getByRole("button", { name: "No, I meant it" }));
    expect(onHome).toHaveBeenCalledOnce();
    expect(onPutBack).not.toHaveBeenCalled();
  });

  // Disabled is not decoration. Two taps on a slow connection would be two undo requests.
  it("cannot be pressed twice while the first undo is still going", () => {
    const onPutBack = vi.fn();
    render(<GoneCard undoUntil={APRIL_2} undoing={true} err={null} onPutBack={onPutBack} onHome={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "putting it back…" }));
    expect(onPutBack).not.toHaveBeenCalled();
  });

  it("sends the one with no way back to the front door", () => {
    const onHome = vi.fn();
    render(<GoneCard undoUntil={null} undoing={false} err={null} onPutBack={vi.fn()} onHome={onHome} />);

    fireEvent.click(screen.getByRole("button", { name: "Start a new one" }));
    expect(onHome).toHaveBeenCalledOnce();
  });
});

describe("the buttons on a room she has left", () => {
  const leftCard = (
    over: Partial<{ undoUntil: number | null; seatFree: boolean; undoing: boolean }>,
    handlers: { onPutBack: () => void; onStartFresh: () => void },
  ) => (
    <LeftCard
      catName="Bean"
      undoUntil={over.undoUntil ?? null}
      theyWereTold={null}
      seatFree={over.seatFree ?? false}
      undoing={over.undoing ?? false}
      err={null}
      {...handlers}
    />
  );

  it("restores her side, and does not quietly start her over", () => {
    const onPutBack = vi.fn();
    const onStartFresh = vi.fn();
    render(leftCard({ undoUntil: APRIL_2, seatFree: true }, { onPutBack, onStartFresh }));

    fireEvent.click(screen.getByRole("button", { name: "Put my side back" }));
    expect(onPutBack).toHaveBeenCalledOnce();
    expect(onStartFresh).not.toHaveBeenCalled();
  });

  it("starts her over only when she asks for that instead", () => {
    const onPutBack = vi.fn();
    const onStartFresh = vi.fn();
    render(leftCard({ undoUntil: APRIL_2, seatFree: true }, { onPutBack, onStartFresh }));

    fireEvent.click(screen.getByRole("button", { name: "No, start fresh instead" }));
    expect(onStartFresh).toHaveBeenCalledOnce();
    expect(onPutBack).not.toHaveBeenCalled();
  });

  it("takes the empty seat when there is nothing of hers left to restore", () => {
    const onStartFresh = vi.fn();
    render(leftCard({ seatFree: true }, { onPutBack: vi.fn(), onStartFresh }));

    fireEvent.click(screen.getByRole("button", { name: "Take the seat again" }));
    expect(onStartFresh).toHaveBeenCalledOnce();
  });

  it("holds her button too while the restore is in flight", () => {
    const onPutBack = vi.fn();
    render(leftCard({ undoUntil: APRIL_2, undoing: true }, { onPutBack, onStartFresh: vi.fn() }));

    fireEvent.click(screen.getByRole("button", { name: "putting it back…" }));
    expect(onPutBack).not.toHaveBeenCalled();
  });
});
