// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useNoteLetter } from "./useNoteLetter.js";

const note = { day: 1, total: 2, text: "A small note, just for you.", final: false };
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("crypto", {
    subtle: {
      digest: async (_algorithm: string, bytes: Uint8Array) =>
        new Uint8Array(32).fill(bytes.reduce((sum, byte) => (sum + byte) % 255, 0)).buffer,
    },
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("remembers opening without saving the words and respects folding it again", async () => {
  const first = renderHook(() => useNoteLetter("abc123", note));
  expect(first.result.current.open).toBe(false);
  act(() => first.result.current.setOpen(true));
  await waitFor(() => expect(localStorage.getItem("mrrp:opened-note:abc123")).toMatch(/^[a-f0-9]{64}$/));
  expect(JSON.stringify(localStorage)).not.toContain(note.text);
  first.unmount();
  const second = renderHook(() => useNoteLetter("abc123", note));
  await waitFor(() => expect(second.result.current.open).toBe(true));
  act(() => second.result.current.setOpen(false));
  await waitFor(() => expect(localStorage.getItem("mrrp:opened-note:abc123")).toBeNull());
  second.unmount();
  const third = renderHook(() => useNoteLetter("abc123", note));
  expect(third.result.current.open).toBe(false);
});

it("folds new words and keeps room preferences separate", async () => {
  const hook = renderHook(({ value }) => useNoteLetter("abc123", value), { initialProps: { value: note } });
  act(() => hook.result.current.setOpen(true));
  await waitFor(() => expect(localStorage.getItem("mrrp:opened-note:abc123")).toBeTruthy());
  hook.rerender({ value: { ...note, text: "Something new for you." } });
  expect(hook.result.current.open).toBe(false);
  const other = renderHook(() => useNoteLetter("otherroom", note));
  expect(other.result.current.open).toBe(false);
});

it("still opens when preference storage is blocked", async () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  const hook = renderHook(() => useNoteLetter("abc123", note));
  act(() => hook.result.current.setOpen(true));
  await waitFor(() => expect(hook.result.current.open).toBe(true));
});

it("ignores an old preference that finishes after the note changes", async () => {
  const complete: ((value: ArrayBuffer) => void)[] = [];
  vi.stubGlobal("crypto", {
    subtle: { digest: () => new Promise<ArrayBuffer>((resolve) => complete.push(resolve)) },
  });
  localStorage.setItem("mrrp:opened-note:abc123", "01".repeat(32));
  const hook = renderHook(({ value }) => useNoteLetter("abc123", value), { initialProps: { value: note } });
  hook.rerender({ value: { ...note, text: "The new note." } });
  await act(async () => {
    complete[1]!(new Uint8Array(32).fill(2).buffer);
  });
  await act(async () => {
    complete[0]!(new Uint8Array(32).fill(1).buffer);
  });
  expect(hook.result.current.open).toBe(false);
});

it("does not close a note she opened while the saved preference was loading", async () => {
  let complete!: (value: ArrayBuffer) => void;
  vi.stubGlobal("crypto", {
    subtle: {
      digest: () =>
        new Promise<ArrayBuffer>((resolve) => {
          complete = resolve;
        }),
    },
  });
  const hook = renderHook(() => useNoteLetter("abc123", note));
  act(() => hook.result.current.setOpen(true));
  await act(async () => {
    complete(new Uint8Array(32).fill(3).buffer);
  });
  expect(hook.result.current.open).toBe(true);
  expect(localStorage.getItem("mrrp:opened-note:abc123")).toBe("03".repeat(32));
});
