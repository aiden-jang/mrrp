// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { fetchKeepsakes } from "./keepsakesApi.js";
import { useKeepsakes } from "./useKeepsakes.js";
vi.mock("./keepsakesApi.js", () => ({ fetchKeepsakes: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const first = { id: "one", gift: "leaf" as const, text: "for you", at: 100 };

it("does not turn a failed read into an empty collection and retries", async () => {
  vi.mocked(fetchKeepsakes)
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce({ items: [first], next: null });
  const hook = renderHook(() => useKeepsakes("abc123", undefined));
  act(() => hook.result.current.show());
  await waitFor(() => expect(hook.result.current.error).toBeTruthy());
  expect(hook.result.current.page).toBeNull();
  act(() => hook.result.current.retry());
  await waitFor(() => expect(hook.result.current.page?.items).toEqual([first]));
  act(() => hook.result.current.show());
  expect(hook.result.current.page?.items).toEqual([first]);
});

it("preserves earlier results when paging fails and does not duplicate pending requests", async () => {
  vi.mocked(fetchKeepsakes)
    .mockResolvedValueOnce({ items: [first], next: "cursor" })
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce({ items: [{ ...first, id: "two" }], next: null });
  const hook = renderHook(() => useKeepsakes("abc123", undefined));
  act(() => hook.result.current.show());
  await waitFor(() => expect(hook.result.current.page?.next).toBe("cursor"));
  act(() => {
    hook.result.current.earlier();
    hook.result.current.earlier();
  });
  await waitFor(() => expect(hook.result.current.error).toBeTruthy());
  expect(fetchKeepsakes).toHaveBeenCalledTimes(2);
  expect(hook.result.current.page?.items).toEqual([first]);
  act(() => hook.result.current.retry());
  await waitFor(() => expect(hook.result.current.page?.items).toHaveLength(2));
  expect(fetchKeepsakes).toHaveBeenLastCalledWith("abc123", "cursor");
});

it("ignores a delayed read after closing and reopening", async () => {
  let resolve!: (value: { items: (typeof first)[]; next: null }) => void;
  vi.mocked(fetchKeepsakes)
    .mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    )
    .mockResolvedValueOnce({ items: [], next: null });
  const hook = renderHook(() => useKeepsakes("abc123", undefined));
  act(() => hook.result.current.show());
  act(() => hook.result.current.close());
  act(() => hook.result.current.show());
  await waitFor(() => expect(hook.result.current.page?.items).toEqual([]));
  await act(async () => resolve({ items: [first], next: null }));
  expect(hook.result.current.page?.items).toEqual([]);
});
