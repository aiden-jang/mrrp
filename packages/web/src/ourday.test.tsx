// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOurDay } from "./useOurDay.js";
import { doOurDay } from "./api.js";
import type { RoomView } from "./types.js";

vi.mock("./api.js", () => ({ doOurDay: vi.fn(async () => {}) }));

afterEach(cleanup);
beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(doOurDay).mockReset().mockResolvedValue(undefined);
});
afterEach(() => vi.useRealTimers());

const view = { ourDay: null } as RoomView;

describe("keeping a day", () => {
  it("does not mark an edit made during a slow save as kept", async () => {
    let finish!: () => void;
    vi.mocked(doOurDay).mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
    const { result } = renderHook(() => useOurDay("r", view, async () => {}, vi.fn()));
    act(() => {
      result.current.setDate("2000-02-29");
      result.current.setLabel("saved version");
    });
    let saving!: Promise<void>;
    act(() => {
      saving = result.current.save();
    });
    act(() => void result.current.save());
    expect(doOurDay).toHaveBeenCalledOnce();
    expect(result.current.saving).toBe(true);
    act(() => result.current.setLabel("new unsaved version"));
    await act(async () => {
      finish();
      await saving;
    });
    expect(result.current.label).toBe("new unsaved version");
    expect(result.current.saved).toBe(false);
    expect(result.current.saving).toBe(false);
    expect(result.current.dirty).toBe(true);
  });

  it("clears the kept feedback as soon as the saved fields change", async () => {
    const { result } = renderHook(() => useOurDay("r", view, async () => {}, vi.fn()));
    act(() => {
      result.current.setDate("2000-02-29");
      result.current.setLabel("the day");
    });
    await act(() => result.current.save());
    expect(result.current.saved).toBe(true);
    expect(result.current.dirty).toBe(false);
    act(() => void vi.advanceTimersByTime(3000));
    expect(result.current.dirty).toBe(false);
    act(() => result.current.setLabel("another day"));
    expect(result.current.saved).toBe(false);
    expect(result.current.dirty).toBe(true);
  });

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
