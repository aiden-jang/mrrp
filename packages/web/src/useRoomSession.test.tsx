// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { adoptSeat, fetchRoom, GoneError, lastCat } from "./api.js";
import { useRoomSession } from "./useRoomSession.js";
import type { RoomView } from "./types.js";

const { take } = vi.hoisted(() => ({ take: { current: null as null | ((view: RoomView) => void) } }));
vi.mock("./live.js", () => ({
  useLive: (_id: string, _enabled: boolean, onView: (view: RoomView) => void) => {
    take.current = onView;
    return "open";
  },
}));
vi.mock("./api.js", async (original) => ({
  ...(await original<typeof import("./api.js")>()),
  beenHere: () => true,
  fetchRoom: vi.fn(),
  adoptSeat: vi.fn(),
  lastCat: { set: vi.fn() },
}));
const view = (name: string) =>
  ({ cat: { name }, seat: name, arrivals: [], awayMs: null }) as unknown as RoomView;
function pending() {
  let resolve!: (room: RoomView) => void;
  const promise = new Promise<RoomView>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

it("a newer live snapshot wins over a delayed room read", async () => {
  const read = pending();
  vi.mocked(fetchRoom).mockReturnValue(read.promise);
  const hook = renderHook(() => useRoomSession("abc123"));
  act(() => take.current!(view("new")));
  await act(async () => read.resolve(view("old")));
  expect(hook.result.current.view?.cat.name).toBe("new");
  expect(adoptSeat).not.toHaveBeenCalledWith("old");
});

it("a poll cannot overwrite an action's newer response", async () => {
  vi.mocked(fetchRoom).mockResolvedValueOnce(view("first"));
  const hook = renderHook(() => useRoomSession("abc123"));
  await waitFor(() => expect(hook.result.current.view).not.toBeNull());
  const read = pending();
  vi.mocked(fetchRoom).mockReturnValue(read.promise);
  let loaded!: Promise<void>;
  act(() => {
    loaded = hook.result.current.load();
  });
  act(() => hook.result.current.setView(view("action")));
  await act(async () => {
    read.resolve(view("old"));
    await loaded;
  });
  expect(hook.result.current.view?.cat.name).toBe("action");
});

it("a read resolving after cleanup cannot adopt a seat or cache room data", async () => {
  const read = pending();
  vi.mocked(fetchRoom).mockReturnValue(read.promise);
  const hook = renderHook(() => useRoomSession("abc123"));
  hook.unmount();
  await act(async () => read.resolve(view("old")));
  expect(adoptSeat).not.toHaveBeenCalled();
  expect(lastCat.set).not.toHaveBeenCalled();
});

it("a superseded deleted-room response cannot replace a live room", async () => {
  let reject!: (error: Error) => void;
  vi.mocked(fetchRoom).mockReturnValue(
    new Promise((_resolve, fail) => {
      reject = fail;
    }),
  );
  const hook = renderHook(() => useRoomSession("abc123"));
  act(() => take.current!(view("new")));
  await act(async () => reject(new GoneError(null)));
  expect(hook.result.current.gone).toBeNull();
});

it("ending the room invalidates a read that was already in flight", async () => {
  const read = pending();
  vi.mocked(fetchRoom).mockReturnValue(read.promise);
  const hook = renderHook(() => useRoomSession("abc123"));
  act(() => hook.result.current.setGone({ undoUntil: 123 }));
  await act(async () => read.resolve(view("old")));
  expect(adoptSeat).not.toHaveBeenCalled();
  expect(hook.result.current.gone).toEqual({ undoUntil: 123 });
});
