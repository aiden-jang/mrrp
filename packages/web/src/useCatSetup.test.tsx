// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { doClock, doDress, doNotes, fetchNotes } from "./api.js";
import { LOOKS, EYES } from "./looks.js";
import type { RoomView } from "./types.js";
import { useCatSetup } from "./useCatSetup.js";

vi.mock("./api.js", () => ({
  fetchNotes: vi.fn(),
  doClock: vi.fn(),
  doDress: vi.fn(),
  doNotes: vi.fn(),
}));
vi.mock("./sound.js", () => ({ play: vi.fn() }));
const view = {
  cat: { name: "Bean", ...LOOKS[0]!.cat, eyes: EYES[0]!.hex },
  clock: { tz: "UTC", homeHour: 19 },
} as RoomView;

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

describe("loading the room editor", () => {
  it("cannot turn an unavailable notes request into a blank saved list", async () => {
    vi.mocked(fetchNotes).mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useCatSetup("test-room", view, vi.fn()));
    await act(() => result.current.start());
    expect(result.current.open).toBe(false);
    expect(result.current.draft).toBeNull();
    expect(result.current.error).toContain("saved notes haven’t changed");
    await act(() => result.current.save());
    expect(doDress).not.toHaveBeenCalled();
    expect(doClock).not.toHaveBeenCalled();
    expect(doNotes).not.toHaveBeenCalled();
  });

  it("can retry and edit the saved notes after the connection recovers", async () => {
    vi.mocked(fetchNotes)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(["the first note", "the second note"]);
    const reload = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useCatSetup("test-room", view, reload));
    await act(() => result.current.start());
    await act(() => result.current.start());
    expect(result.current.open).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.draft?.notes).toBe("the first note\nthe second note");
    await act(() => result.current.save());
    expect(doNotes).toHaveBeenCalledWith("test-room", ["the first note", "the second note"]);
    expect(reload).toHaveBeenCalledOnce();
  });
});
