// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useRoomSharing } from "./useRoomSharing.js";
import { makeKeepsake } from "./keepsake.js";
vi.mock("./keepsake.js", () => ({
  makeKeepsake: vi.fn(async () => new Blob(["postcard"], { type: "image/png" })),
}));
const share = vi.fn();
beforeEach(() => {
  Object.defineProperty(navigator, "share", { configurable: true, value: share });
  Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  vi.stubGlobal(
    "URL",
    Object.assign(class extends URL {}, {
      createObjectURL: vi.fn(() => "blob:postcard"),
      revokeObjectURL: vi.fn(),
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "share");
  Reflect.deleteProperty(navigator, "canShare");
});

it("ignores a postcard that finishes after the room closes", async () => {
  let resolve!: (blob: Blob) => void;
  const capture = () =>
    new Promise<Blob>((done) => {
      resolve = done;
    });
  const hook = renderHook(() => useRoomSharing(null, vi.fn()));
  act(() => hook.result.current.handleCaptureReady(capture));
  let saved!: Promise<void>;
  act(() => {
    saved = hook.result.current.saveRoomImage();
  });
  hook.unmount();
  await act(async () => {
    resolve(new Blob(["room"]));
    await saved;
  });
  expect(makeKeepsake).not.toHaveBeenCalled();
  expect(share).not.toHaveBeenCalled();
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});

it("a second invite click does not open another native share sheet", () => {
  share.mockReturnValue(new Promise(() => {}));
  const hook = renderHook(() => useRoomSharing(null, vi.fn()));
  act(() => {
    void hook.result.current.shareRoom();
    void hook.result.current.shareRoom();
  });
  expect(share).toHaveBeenCalledOnce();
});

it("prepares the postcard before an explicit native-share click", async () => {
  share.mockResolvedValue(undefined);
  const hook = renderHook(() => useRoomSharing(null, vi.fn()));
  act(() => hook.result.current.handleCaptureReady(async () => new Blob(["room"])));
  await act(() => hook.result.current.saveRoomImage());
  expect(share).not.toHaveBeenCalled();
  expect(hook.result.current.canSharePostcard).toBe(true);
  let sharing!: Promise<void>;
  act(() => {
    sharing = hook.result.current.sharePostcard();
    expect(share).toHaveBeenCalledOnce();
  });
  await act(async () => sharing);
});
