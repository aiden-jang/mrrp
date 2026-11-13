// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useCanvasCapture } from "./useCanvasCapture.js";

afterEach(cleanup);

function setup() {
  const blob = new Blob(["painted room"], { type: "image/png" });
  const toBlob = vi.fn((finish: BlobCallback) => finish(blob));
  const canvas = { current: { toBlob } as unknown as HTMLCanvasElement };
  let capture!: () => Promise<Blob | null>;
  const onCapture = (next: typeof capture) => (capture = next);
  const hook = renderHook(() => useCanvasCapture(canvas, onCapture));
  return { ...hook, blob, toBlob, capture: () => capture() };
}

it("waits for the first painted frame before taking a postcard", async () => {
  const hook = setup();
  const captured = hook.capture();
  expect(hook.toBlob).not.toHaveBeenCalled();
  act(() => hook.result.current.painted());
  expect(await captured).toBe(hook.blob);
  expect(hook.toBlob).toHaveBeenCalledOnce();
});

it("waits for a new frame after resizing clears the canvas", async () => {
  const hook = setup();
  act(() => hook.result.current.painted());
  act(() => hook.result.current.invalidate());
  const captured = hook.capture();
  expect(hook.toBlob).not.toHaveBeenCalled();
  act(() => hook.result.current.painted());
  expect(await captured).toBe(hook.blob);
});

it("settles queued and stale captures when the room closes", async () => {
  const hook = setup();
  const captured = hook.capture();
  hook.unmount();
  expect(await captured).toBeNull();
  expect(await hook.capture()).toBeNull();
  expect(hook.toBlob).not.toHaveBeenCalled();
});
