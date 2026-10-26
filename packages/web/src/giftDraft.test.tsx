// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { doLeaveGift } from "./api.js";
import { useRoomActions } from "./useRoomActions.js";
vi.mock("./api.js", () => ({ doLeaveGift: vi.fn() }));
vi.mock("./sound.js", () => ({ play: vi.fn(), buzz: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it("an unsuccessful gift cannot overwrite words typed while it was being sent", async () => {
  let reject!: (error: Error) => void;
  vi.mocked(doLeaveGift).mockReturnValue(
    new Promise((_resolve, fail) => {
      reject = fail;
    }),
  );
  const hook = renderHook(() =>
    useRoomActions({
      id: "abc123",
      setView: vi.fn(),
      onError: vi.fn(),
      onDid: vi.fn(),
      load: vi.fn(),
      setNudge: vi.fn(),
      setShelfAt: vi.fn(),
    }),
  );
  act(() => hook.result.current.setGiftWords("first words"));
  let sent!: Promise<void>;
  act(() => {
    sent = hook.result.current.leaveGift("leaf");
  });
  act(() => hook.result.current.setGiftWords("new words"));
  await act(async () => {
    reject(new Error("offline"));
    await sent;
  });
  expect(hook.result.current.giftWords).toBe("new words");
});
