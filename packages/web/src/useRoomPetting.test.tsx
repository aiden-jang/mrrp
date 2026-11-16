// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { doHold } from "./api.js";
import { PET_TAP_MS, useRoomPetting } from "./useRoomPetting.js";

vi.mock("./api.js", () => ({ doHold: vi.fn() }));
beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(doHold).mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("extends repeated button pets instead of releasing the newer one", async () => {
  const { result } = renderHook(() => useRoomPetting("room"));
  await act(async () => result.current.pet());
  act(() => vi.advanceTimersByTime(1000));
  await act(async () => result.current.pet());
  act(() => vi.advanceTimersByTime(1000));
  expect(vi.mocked(doHold).mock.calls).toEqual([["room", true]]);
  expect(result.current.petAt).not.toBeNull();
  await act(async () => vi.advanceTimersByTime(PET_TAP_MS));
  expect(vi.mocked(doHold).mock.calls).toEqual([
    ["room", true],
    ["room", false],
  ]);
  expect(result.current.petAt).toBeNull();
});

it("keeps pointer contact active after a button pet ends", async () => {
  const { result } = renderHook(() => useRoomPetting("room"));
  await act(async () => result.current.pet());
  await act(async () => result.current.hold(true));
  await act(async () => vi.advanceTimersByTime(PET_TAP_MS));
  expect(vi.mocked(doHold).mock.calls).toEqual([["room", true]]);
  await act(async () => result.current.hold(false));
  expect(doHold).toHaveBeenLastCalledWith("room", false);
});

it("sends release after a delayed press, even after unmount", async () => {
  let finish!: () => void;
  vi.mocked(doHold).mockReturnValueOnce(
    new Promise<void>((resolve) => {
      finish = resolve;
    }),
  );
  const { result, unmount } = renderHook(() => useRoomPetting("room"));
  act(() => result.current.hold(true));
  act(() => result.current.hold(false));
  unmount();
  expect(vi.mocked(doHold).mock.calls).toEqual([["room", true]]);
  await act(async () => finish());
  expect(vi.mocked(doHold).mock.calls).toEqual([
    ["room", true],
    ["room", false],
  ]);
});

it.each(["blur", "offline"])("ends pointer and button contact on %s", async (name) => {
  const { result } = renderHook(() => useRoomPetting("room"));
  await act(async () => {
    result.current.pet();
    result.current.hold(true);
  });
  await act(async () => window.dispatchEvent(new Event(name)));
  expect(result.current.petAt).toBeNull();
  expect(vi.mocked(doHold).mock.calls).toEqual([
    ["room", true],
    ["room", false],
  ]);
  await act(async () => vi.advanceTimersByTime(PET_TAP_MS));
  expect(doHold).toHaveBeenCalledTimes(2);
});

it("ends contact when hidden and does not restart on return", async () => {
  const { result } = renderHook(() => useRoomPetting("room"));
  await act(async () => result.current.pet());
  const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  await act(async () => document.dispatchEvent(new Event("visibilitychange")));
  hidden.mockReturnValue(false);
  await act(async () => document.dispatchEvent(new Event("visibilitychange")));
  expect(result.current.petAt).toBeNull();
  expect(vi.mocked(doHold).mock.calls).toEqual([
    ["room", true],
    ["room", false],
  ]);
  hidden.mockRestore();
});
