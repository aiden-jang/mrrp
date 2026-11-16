// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { doSay } from "./api.js";
import { useSayBox } from "./useSayBox.js";
vi.mock("./api.js", () => ({ doSay: vi.fn() }));
vi.mock("./sound.js", () => ({ play: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it("explains a failed reply and keeps the words available for retry", async () => {
  vi.mocked(doSay).mockRejectedValueOnce(new Error("That didn't reach the room. try again."));
  const onError = vi.fn();
  const hook = renderHook(() => useSayBox("abc123", vi.fn(), vi.fn(), onError));
  act(() => {
    hook.result.current.start(null);
    hook.result.current.setText("still here 🌱");
  });
  await act(() => hook.result.current.say());
  expect(onError).toHaveBeenCalledWith("That didn't reach the room. try again.");
  expect(hook.result.current.open).toBe(true);
  expect(hook.result.current.text).toBe("still here 🌱");
});

it("one pending reply cannot be sent twice in the same render", async () => {
  vi.mocked(doSay).mockReturnValue(new Promise(() => {}));
  const hook = renderHook(() => useSayBox("abc123", vi.fn(), vi.fn(), vi.fn()));
  act(() => {
    void hook.result.current.say();
    void hook.result.current.say();
  });
  expect(doSay).toHaveBeenCalledOnce();
});

it("keeps a drawing-only reply after failure and sends it again on retry", async () => {
  const drawing = "1" + "0".repeat(134);
  vi.mocked(doSay)
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce({} as never);
  const hook = renderHook(() => useSayBox("abc123", vi.fn(), vi.fn(), vi.fn()));
  act(() => {
    hook.result.current.start(0);
    hook.result.current.setDrawing(drawing);
  });
  await act(() => hook.result.current.say());
  expect(hook.result.current.drawing).toBe(drawing);
  expect(hook.result.current.open).toBe(true);
  await act(() => hook.result.current.say());
  expect(doSay).toHaveBeenLastCalledWith("abc123", "", 0, drawing);
});
