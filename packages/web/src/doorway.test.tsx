// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDoorway } from "./useDoorway.js";
import type { RoomView } from "./types.js";

vi.mock("./sound.js", () => ({ play: vi.fn() }));

afterEach(cleanup);
beforeEach(() => vi.useFakeTimers());
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

  it("watches the door when they leave, not when they arrive", () => {
    const { result, rerender } = renderHook(({ view }) => useDoorway(view), {
      initialProps: { view: room({ themHereNow: false }) },
    });
    rerender({ view: room({ themHereNow: true }) });
    expect(result.current.watchAt).toBeNull();

    rerender({ view: room({ themHereNow: false }) });
    expect(result.current.watchAt).not.toBeNull();
  });
});
