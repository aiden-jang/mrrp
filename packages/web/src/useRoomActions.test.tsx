// @vitest-environment jsdom
import { useState } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { doTell } from "./api.js";
import type { RoomView } from "./types.js";
import { useRoomActions } from "./useRoomActions.js";

vi.mock("./api.js", async (original) => ({
  ...(await original<typeof import("./api.js")>()),
  doTell: vi.fn(),
}));
vi.mock("./sound.js", () => ({ play: vi.fn(), buzz: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

function pending() {
  let resolve!: (value: RoomView) => void;
  const promise = new Promise<RoomView>((done) => (resolve = done));
  return { promise, resolve };
}

function setup() {
  const onError = vi.fn();
  const load = vi.fn().mockResolvedValue(undefined);
  const hook = renderHook(() => {
    const [view, setView] = useState<RoomView | null>({ catMood: null } as RoomView);
    const actions = useRoomActions({
      id: "test-room",
      setView,
      load,
      onError,
      onDid: vi.fn(),
      setNudge: vi.fn(),
      setShelfAt: vi.fn(),
    });
    return { actions, view };
  });
  return { ...hook, load, onError };
}

it("sends rapid mood changes in order and keeps only the latest queued choice", async () => {
  const first = pending();
  const last = pending();
  vi.mocked(doTell).mockReturnValueOnce(first.promise).mockReturnValueOnce(last.promise);
  const { result } = setup();
  let saving!: Promise<void>;
  act(() => {
    saving = result.current.actions.tell("good");
  });
  act(() => void result.current.actions.tell("sad"));
  act(() => void result.current.actions.tell("tired"));
  expect(doTell).toHaveBeenCalledTimes(1);
  expect(result.current.actions.pendingMood).toBe("tired");
  await act(async () => first.resolve({ catMood: "good" } as RoomView));
  expect(doTell).toHaveBeenLastCalledWith("test-room", "tired");
  expect(result.current.view?.catMood).toBeNull();
  expect(result.current.actions.pendingMood).toBe("tired");
  await act(async () => {
    last.resolve({ catMood: "tired" } as RoomView);
    await saving;
  });
  expect(result.current.view?.catMood).toBe("tired");
  expect(result.current.actions.pendingMood).toBeNull();
});

it("explains a failed mood save after refreshing the saved room", async () => {
  vi.mocked(doTell).mockRejectedValue(new Error("offline"));
  const { result, load, onError } = setup();
  await act(() => result.current.actions.tell("sad"));
  expect(load).toHaveBeenCalledOnce();
  expect(onError).toHaveBeenLastCalledWith("Couldn’t save your mood. Try again.");
  expect(result.current.actions.pendingMood).toBeNull();
});

it("does not send a queued mood or show feedback after leaving the room", async () => {
  const first = pending();
  vi.mocked(doTell).mockReturnValue(first.promise);
  const { result, unmount, onError } = setup();
  let saving!: Promise<void>;
  act(() => {
    saving = result.current.actions.tell("good");
  });
  act(() => void result.current.actions.tell("sad"));
  unmount();
  onError.mockClear();
  await act(async () => {
    first.resolve({ catMood: "good" } as RoomView);
    await saving;
  });
  expect(doTell).toHaveBeenCalledOnce();
  expect(onError).not.toHaveBeenCalled();
});
