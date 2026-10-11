// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { play } from "./sound.js";
import { useDoorway } from "./useDoorway.js";
import type { RoomView } from "./types.js";

vi.mock("./sound.js", () => ({ play: vi.fn() }));

afterEach(cleanup);
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});
afterEach(() => vi.useRealTimers());

const room = (over: Partial<RoomView>) => ({ you: null, themHereNow: false, ...over }) as RoomView;

describe("the door", () => {
  it("stays open the full time when they come in behind you", () => {
    const { result, rerender } = renderHook(({ view }) => useDoorway(view), {
      initialProps: { view: room({ you: "Aiden" }) },
    });
    expect(result.current.openAt).not.toBeNull();

    act(() => void vi.advanceTimersByTime(1000));
    rerender({ view: room({ you: "Aiden", themHereNow: true }) });
    expect(result.current.openAt).not.toBeNull();

    // 4200ms after your own arrival, which is when the first swing's timer would have fired.
    act(() => void vi.advanceTimersByTime(3200));
    expect(result.current.openAt).not.toBeNull();

    act(() => void vi.advanceTimersByTime(1000));
    expect(result.current.openAt).toBeNull();
  });

  it("does not swing on the first view it is given", () => {
    const { result } = renderHook(() => useDoorway(room({ themHereNow: true })));
    expect(result.current.openAt).toBeNull();
    expect(result.current.watchAt).toBeNull();
  });

  it("glances toward the door on arrivals and departures", () => {
    const { result, rerender } = renderHook(({ view }) => useDoorway(view), {
      initialProps: { view: room({ themHereNow: false }) },
    });
    rerender({ view: room({ themHereNow: true }) });
    expect(result.current.watchAt).not.toBeNull();

    rerender({ view: room({ themHereNow: false }) });
    expect(result.current.watchAt).not.toBeNull();
  });
});

it("does not mistake the first loaded view for a new arrival", () => {
  const { result, rerender } = renderHook(({ view }) => useDoorway(view), {
    initialProps: { view: null as RoomView | null },
  });
  rerender({ view: room({ you: "Aiden", themHereNow: true }) });
  expect(result.current.watchAt).toBeNull();
  expect(play).not.toHaveBeenCalled();
});

it("greets once per arrival rather than on every room update", () => {
  const { result, rerender } = renderHook(({ view }) => useDoorway(view), {
    initialProps: { view: room({ you: "Aiden", themHereNow: false }) },
  });
  rerender({ view: room({ you: "Aiden", themHereNow: true }) });
  const glance = result.current.watchAt;
  act(() => void vi.advanceTimersByTime(1000));
  rerender({ view: room({ you: "Aiden", themHereNow: true, catMood: "tired" }) });
  expect(result.current.watchAt).toBe(glance);
  expect(play).toHaveBeenCalledTimes(1);
  expect(play).toHaveBeenCalledWith("chirp");
  rerender({ view: room({ you: "Aiden", themHereNow: false }) });
  act(() => void vi.advanceTimersByTime(1000));
  rerender({ view: room({ you: "Aiden", themHereNow: true }) });
  expect(result.current.watchAt).not.toBe(glance);
  expect(play).toHaveBeenCalledTimes(2);
});

it("keeps the glance still when reduced motion is requested", () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  try {
    const { result, rerender } = renderHook(({ view }) => useDoorway(view), {
      initialProps: { view: room({ themHereNow: false }) },
    });
    rerender({ view: room({ themHereNow: true }) });
    expect(result.current.watchAt).toBeNull();
  } finally {
    vi.unstubAllGlobals();
  }
});
