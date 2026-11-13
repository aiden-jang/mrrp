// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchNotes, saveCatSetup } from "./api.js";
import { LOOKS, EYES } from "./looks.js";
import type { RoomView } from "./types.js";
import { useCatSetup } from "./useCatSetup.js";

vi.mock("./api.js", () => ({
  fetchNotes: vi.fn(),
  saveCatSetup: vi.fn(),
}));
vi.mock("./sound.js", () => ({ play: vi.fn() }));
const view = {
  cat: { name: "Bean", ...LOOKS[0]!.cat, eyes: EYES[0]!.hex },
  clock: { tz: "UTC", homeHour: 19 },
} as RoomView;

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

describe("loading the room editor", () => {
  it("does not submit the same draft twice while a save is pending", async () => {
    vi.mocked(fetchNotes).mockResolvedValue(["a note"]);
    let finish!: () => void;
    vi.mocked(saveCatSetup).mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
    const { result } = renderHook(() => useCatSetup("test-room", view, vi.fn()));
    await act(() => result.current.start());
    let saving!: Promise<boolean>;
    act(() => {
      saving = result.current.save();
      void result.current.save();
    });
    expect(saveCatSetup).toHaveBeenCalledOnce();
    await act(async () => {
      finish();
      await saving;
    });
  });

  it("can edit appearance without loading or rewriting notes", async () => {
    vi.mocked(fetchNotes).mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useCatSetup("test-room", view, vi.fn()));
    await act(() => result.current.start());
    expect(result.current.open).toBe(true);
    expect(fetchNotes).not.toHaveBeenCalled();
    expect(result.current.draft).not.toHaveProperty("notes");
    await act(() => result.current.save());
    expect(saveCatSetup).toHaveBeenCalledWith(
      "test-room",
      expect.not.objectContaining({ notes: expect.anything() }),
    );
  });

  it("keeps an appearance draft after a failed save and supports retry", async () => {
    vi.mocked(saveCatSetup).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(undefined);
    const reload = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useCatSetup("test-room", view, reload));
    await act(() => result.current.start());
    act(() => result.current.setDraft((draft) => ({ ...draft!, name: "Miso" })));
    await act(() => result.current.save());
    expect(result.current.open).toBe(true);
    expect(result.current.draft?.name).toBe("Miso");
    await act(() => result.current.save());
    expect(saveCatSetup).toHaveBeenCalledWith(
      "test-room",
      expect.objectContaining({
        cat: { ...view.cat, name: "Miso" },
        clock: view.clock,
      }),
    );
    expect(reload).toHaveBeenCalledOnce();
  });
});
