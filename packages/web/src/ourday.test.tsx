// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOurDay } from "./useOurDay.js";
import type { RoomView } from "./types.js";

vi.mock("./api.js", () => ({ doOurDay: vi.fn(async () => {}) }));

afterEach(cleanup);
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const view = { ourDay: null } as RoomView;

describe("keeping a day", () => {
  it("shows Kept for the full time after a second save", async () => {
    const { result } = renderHook(() => useOurDay("r", view, async () => {}, vi.fn()));
    act(() => {
      result.current.setDate("2000-02-29");
      result.current.setLabel("the day");
    });

    await act(async () => void (await result.current.save()));
    expect(result.current.saved).toBe(true);

    act(() => void vi.advanceTimersByTime(2000));
    await act(async () => void (await result.current.save()));

    // 2400ms after the first save, which is when its timer would have cleared the second's.
    act(() => void vi.advanceTimersByTime(400));
    expect(result.current.saved).toBe(true);

    act(() => void vi.advanceTimersByTime(2000));
    expect(result.current.saved).toBe(false);
  });

  it("loads the stored day once and then leaves it alone while it is being typed", () => {
    const stored = { ourDay: { month: 2, day: 29, label: "the day" } } as RoomView;
    const { result, rerender } = renderHook(({ v }) => useOurDay("r", v, async () => {}, vi.fn()), {
      initialProps: { v: stored },
    });
    expect(result.current.date).toBe("2000-02-29");

    act(() => void result.current.setDate("2000-07-04"));
    rerender({ v: { ...stored } as RoomView });
    expect(result.current.date).toBe("2000-07-04");
  });
});
