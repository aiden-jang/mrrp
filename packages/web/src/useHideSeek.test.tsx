// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useHideSeek } from "./useHideSeek.js";
import { sendSeek } from "./hideSeekApi.js";
import type { RoomView } from "./types.js";

vi.mock("./hideSeekApi.js", () => ({ sendSeek: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it("sends one request while pending and keeps errors through unrelated snapshots", async () => {
  let reject!: (error: Error) => void;
  vi.mocked(sendSeek).mockReturnValue(
    new Promise((_resolve, fail) => {
      reject = fail;
    }),
  );
  const load = vi.fn().mockResolvedValue(undefined);
  const view = { hideSeek: { id: "first", phase: "hiding", checked: [] } } as unknown as RoomView;
  const { result, rerender } = renderHook(({ view }) => useHideSeek("room", view, load), {
    initialProps: { view },
  });
  let request!: Promise<void>;
  act(() => {
    request = result.current.seek("search", "curtain");
  });
  expect(result.current.hideSeekPending).toBe(true);
  await act(() => result.current.seek("search", "cabinet"));
  expect(sendSeek).toHaveBeenCalledTimes(1);
  expect(sendSeek).toHaveBeenCalledWith("room", { kind: "search", round: "first", spot: "curtain" });
  await act(async () => {
    reject(new Error("Couldn’t share that. Try again."));
    await request;
  });
  expect(result.current.hideSeekPending).toBe(false);
  expect(result.current.hideSeekError).toBe("Couldn’t share that. Try again.");
  rerender({ view: { ...view, bothHereNow: true } });
  expect(result.current.hideSeekError).toBe("Couldn’t share that. Try again.");
  expect(load).toHaveBeenCalledOnce();
});

it("ignores unrelated room props and already checked spots", () => {
  const view = {
    youAreHer: false,
    hideSeek: { id: "first", phase: "hiding", checked: ["curtain"] },
  } as RoomView;
  const { result } = renderHook(() => useHideSeek("room", view, vi.fn()));
  act(() => {
    result.current.searchProp("floor");
    result.current.searchProp("window");
  });
  expect(sendSeek).not.toHaveBeenCalled();
});
