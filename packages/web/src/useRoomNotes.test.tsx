// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fetchNotes, saveRoomNotes } from "./api.js";
import { useRoomNotes } from "./useRoomNotes.js";

vi.mock("./api.js", () => ({ fetchNotes: vi.fn(), saveRoomNotes: vi.fn() }));
vi.mock("./sound.js", () => ({ play: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

it("cannot turn a failed read into an empty editable or saved list", async () => {
  vi.mocked(fetchNotes).mockRejectedValue(new Error("offline"));
  const { result } = renderHook(() => useRoomNotes("r", vi.fn()));
  await act(() => result.current.start());
  expect(result.current.open).toBe(false);
  expect(result.current.draft).toBeNull();
  expect(result.current.error).toContain("saved notes haven’t changed");
  await act(() => result.current.save());
  expect(saveRoomNotes).not.toHaveBeenCalled();
});

it("retries the saved notes read and preserves words after a failed save", async () => {
  vi.mocked(fetchNotes).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(["one", "two"]);
  vi.mocked(saveRoomNotes).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(undefined);
  const reload = vi.fn();
  const { result } = renderHook(() => useRoomNotes("r", reload));
  await act(() => result.current.start());
  await act(() => result.current.start());
  act(() => result.current.setDraft(["new words", "two"]));
  await act(() => result.current.save());
  expect(result.current.open).toBe(true);
  expect(result.current.draft).toEqual(["new words", "two"]);
  expect(result.current.saving).toBe(false);
  await act(() => result.current.save());
  expect(saveRoomNotes).toHaveBeenLastCalledWith("r", ["new words", "two"]);
  expect(result.current.open).toBe(false);
  expect(reload).toHaveBeenCalledOnce();
});

it("submits a pending notes draft only once", async () => {
  vi.mocked(fetchNotes).mockResolvedValue(["one"]);
  let finish!: () => void;
  vi.mocked(saveRoomNotes).mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
  const { result } = renderHook(() => useRoomNotes("r", vi.fn()));
  await act(() => result.current.start());
  let saving!: Promise<boolean>;
  act(() => {
    saving = result.current.save();
    void result.current.save();
  });
  expect(saveRoomNotes).toHaveBeenCalledOnce();
  await act(async () => {
    finish();
    await saving;
  });
});
