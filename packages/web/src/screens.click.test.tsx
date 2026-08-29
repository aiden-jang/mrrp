// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GoneCard, LeftCard } from "./screens.js";

afterEach(cleanup);

const APRIL_2 = Date.parse("2026-04-02T12:00:00Z");

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
