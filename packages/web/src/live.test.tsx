// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useLive } from "./live.js";

class Socket {
  static CONNECTING = 0;
  static OPEN = 1;
  static all: Socket[] = [];
  readyState = 0;
  onopen?: () => void;
  onmessage?: (event: { data: string }) => void;
  onclose?: () => void;
  onerror?: () => void;
  close = vi.fn();
  send = vi.fn();
  constructor(readonly url: string) {
    Socket.all.push(this);
  }
}
beforeEach(() => {
  Socket.all = [];
  vi.stubGlobal("WebSocket", Socket);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("ignores every callback from a disposed room connection", () => {
  const oldView = vi.fn();
  const oldGone = vi.fn();
  const hook = renderHook(({ id }) => useLive(id, true, oldView, oldGone), {
    initialProps: { id: "abc123" },
  });
  const old = Socket.all[0]!;
  hook.rerender({ id: "def456" });
  act(() => {
    old.onopen?.();
    old.onmessage?.({ data: JSON.stringify({ type: "view", view: { you: "old" } }) });
    old.onmessage?.({ data: JSON.stringify({ type: "gone" }) });
    old.onclose?.();
  });
  expect(oldView).not.toHaveBeenCalled();
  expect(oldGone).not.toHaveBeenCalled();
  expect(hook.result.current).toBe("connecting");
});

it("a visibility event reuses a connection that is still opening", () => {
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  renderHook(() => useLive("abc123", true, vi.fn(), vi.fn()));
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(Socket.all).toHaveLength(1);
});

it("malformed messages do not break a healthy live channel", () => {
  const take = vi.fn();
  renderHook(() => useLive("abc123", true, take, vi.fn()));
  const socket = Socket.all[0]!;
  expect(() => act(() => socket.onmessage?.({ data: "{" }))).not.toThrow();
  act(() => socket.onmessage?.({ data: JSON.stringify({ type: "view", view: { you: "current" } }) }));
  expect(take).toHaveBeenCalledWith({ you: "current" });
});
