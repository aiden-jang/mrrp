// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { doKeepGift } from "./api.js";
import { useRoomActions } from "./useRoomActions.js";

vi.mock("./api.js", () => ({ doKeepGift: vi.fn() }));
vi.mock("./sound.js", () => ({ play: vi.fn(), buzz: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

function setup() {
  const onError = vi.fn(),
    load = vi.fn(),
    setView = vi.fn();
  const hook = renderHook(() =>
    useRoomActions({
      id: "abc123",
      setView,
      onError,
      onDid: vi.fn(),
      load,
      setNudge: vi.fn(),
      setShelfAt: vi.fn(),
    }),
  );
  return { hook, onError, load, setView };
}

it("coalesces clicks and waits for authoritative state", async () => {
  let resolve!: (kept: boolean) => void;
  vi.mocked(doKeepGift).mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const { hook, load, setView } = setup();
  let sent!: Promise<void>;
  act(() => {
    sent = hook.result.current.keepGift("first");
    void hook.result.current.keepGift("first");
  });
  expect(hook.result.current.keepingGift).toBe(true);
  expect(doKeepGift).toHaveBeenCalledExactlyOnceWith("abc123", "first");
  expect(setView).not.toHaveBeenCalled();
  await act(async () => {
    resolve(true);
    await sent;
  });
  expect(load).toHaveBeenCalledOnce();
  expect(hook.result.current.keepingGift).toBe(false);
});

it("refreshes a changed gift and reports the conflict", async () => {
  vi.mocked(doKeepGift).mockResolvedValue(false);
  const { hook, load } = setup();
  await act(() => hook.result.current.keepGift("old"));
  expect(load).toHaveBeenCalledOnce();
  expect(hook.result.current.keepGiftError).toBe("That gift changed. Check what’s here now.");
});

it("preserves the gift on failure and allows retry", async () => {
  vi.mocked(doKeepGift).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(true);
  const { hook, load, setView } = setup();
  await act(() => hook.result.current.keepGift("first"));
  expect(setView).not.toHaveBeenCalled();
  expect(load).not.toHaveBeenCalled();
  expect(hook.result.current.keepGiftError).toBe("Couldn’t keep that. Try again.");
  await act(() => hook.result.current.keepGift("first"));
  expect(load).toHaveBeenCalledOnce();
  expect(hook.result.current.keepGiftError).toBeNull();
});
