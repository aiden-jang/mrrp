// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { doCatAct } from "./api.js";
import { useRoomAffection } from "./useRoomAffection.js";
import type { Affection, RoomView } from "./types.js";

vi.mock("./api.js", () => ({ doCatAct: vi.fn() }));
beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(doCatAct)
    .mockReset()
    .mockResolvedValue({} as RoomView);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function setup(affection: Affection | null = { kind: "ask", at: 1, remainingMs: 20_000 }) {
  const load = vi.fn().mockResolvedValue(undefined);
  const onError = vi.fn();
  const hook = renderHook(
    ({ affection }) =>
      useRoomAffection({
        id: "room",
        view: { affection } as RoomView,
        load,
        onError,
      }),
    { initialProps: { affection } },
  );
  return { ...hook, load, onError };
}

it("expires on the local clock without waiting for another snapshot", () => {
  const { result } = setup();
  act(() => vi.advanceTimersByTime(19_999));
  expect(result.current.affection?.kind).toBe("ask");
  act(() => vi.advanceTimersByTime(1));
  expect(result.current.affection).toBeNull();
});

it("expires a reaction locally and keeps it separate from affection", () => {
  const view = { reaction: { kind: "flop", at: 1, remainingMs: 3600 }, affection: null } as RoomView;
  const { result } = renderHook(() =>
    useRoomAffection({ id: "room", view, load: vi.fn(), onError: vi.fn() }),
  );
  expect(result.current.reaction?.kind).toBe("flop");
  expect(result.current.affection).toBeNull();
  act(() => vi.advanceTimersByTime(3600));
  expect(result.current.reaction).toBeNull();
  expect(result.current.affection).toBeNull();
});

it("does not invent a reaction after a failed send", async () => {
  vi.mocked(doCatAct).mockRejectedValue(new Error("offline"));
  const { result, onError } = setup(null);
  await act(() => result.current.catGesture("flop"));
  expect(result.current.reaction).toBeNull();
  expect(result.current.affection).toBeNull();
  expect(result.current.reactionPending).toBeNull();
  expect(onError).toHaveBeenLastCalledWith("Couldn’t share that. Try again.");
});

it("does not extend or replay a request when an old snapshot arrives", () => {
  const { result, rerender } = setup();
  act(() => vi.advanceTimersByTime(10_000));
  rerender({ affection: { kind: "ask", at: 1, remainingMs: 20_000 } });
  act(() => vi.advanceTimersByTime(10_000));
  expect(result.current.affection).toBeNull();
  rerender({ affection: null });
  rerender({ affection: { kind: "ask", at: 1, remainingMs: 20_000 } });
  expect(result.current.affection).toBeNull();
  rerender({ affection: { kind: "nuzzle", at: 2, remainingMs: 1600 } });
  expect(result.current.affection?.kind).toBe("nuzzle");
});

it("coalesces repeated commands and refreshes after a confirmed save", async () => {
  let finish!: (view: RoomView) => void;
  vi.mocked(doCatAct).mockReturnValue(
    new Promise<RoomView>((resolve) => {
      finish = resolve;
    }),
  );
  const { result, load } = setup(null);
  act(() => {
    void result.current.catGesture("ask-pets");
    void result.current.catGesture("ask-pets");
  });
  expect(doCatAct).toHaveBeenCalledExactlyOnceWith("room", "ask-pets");
  expect(result.current.affectionPending).toBe(true);
  expect(result.current.affection).toBeNull();
  await act(async () => finish({} as RoomView));
  expect(load).toHaveBeenCalledOnce();
  expect(result.current.affectionPending).toBe(false);
});

it("keeps a request available after a failed cancellation", async () => {
  vi.mocked(doCatAct).mockRejectedValue(new Error("offline"));
  const { result, onError, load } = setup();
  await act(() => result.current.catGesture("cancel-pets"));
  expect(result.current.affection?.kind).toBe("ask");
  expect(result.current.affectionPending).toBe(false);
  expect(onError).toHaveBeenLastCalledWith("Couldn’t share that. Try again.");
  expect(load).not.toHaveBeenCalled();
});

it("ignores completion after leaving the room", async () => {
  let finish!: (view: RoomView) => void;
  vi.mocked(doCatAct).mockReturnValue(
    new Promise<RoomView>((resolve) => {
      finish = resolve;
    }),
  );
  const { result, unmount, load } = setup(null);
  act(() => {
    void result.current.catGesture("ask-pets");
  });
  unmount();
  await act(async () => finish({} as RoomView));
  expect(load).not.toHaveBeenCalled();
});
