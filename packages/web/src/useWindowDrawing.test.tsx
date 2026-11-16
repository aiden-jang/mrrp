// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useWindowDrawing } from "./useWindowDrawing.js";
import { saveWindowStrokes } from "./windowDrawingApi.js";
import type { WindowDrawing, WindowStroke } from "./types.js";

vi.mock("./windowDrawingApi.js", () => ({ saveWindowStrokes: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const a: WindowStroke = { id: "a", ink: "ink", points: [[1, 2]] };
const b: WindowStroke = { id: "b", ink: "rose", points: [[3, 4]] };
const empty: WindowDrawing = { revision: 0, strokes: [] };

it("keeps local strokes through remote edits and failed saves, then retries the same IDs", async () => {
  vi.mocked(saveWindowStrokes).mockRejectedValueOnce(new Error("offline"));
  const load = vi.fn().mockResolvedValue(undefined);
  const { result, rerender } = renderHook(({ saved }) => useWindowDrawing("room", saved, load), {
    initialProps: { saved: empty },
  });
  act(() => {
    result.current.addWindowStroke(a);
  });
  rerender({ saved: { revision: 1, strokes: [b] } });
  expect(result.current.windowStrokes).toEqual([b, a]);
  await act(() => result.current.saveWindowDrawing());
  expect(result.current.windowDraft).toEqual([a]);
  expect(result.current.windowDrawingError).toBe("offline");
  vi.mocked(saveWindowStrokes).mockResolvedValue({ revision: 2, strokes: [b, a] });
  await act(() => result.current.saveWindowDrawing());
  expect(saveWindowStrokes).toHaveBeenNthCalledWith(2, "room", [a]);
  expect(result.current.windowDraft).toEqual([]);
  expect(result.current.windowStrokes).toEqual([b, a]);
  rerender({ saved: { revision: 3, strokes: [b] } });
  expect(result.current.windowStrokes).toEqual([b]);
});

it("does not let a delayed acknowledgement hide newer remote strokes", async () => {
  let resolve!: (drawing: WindowDrawing) => void;
  vi.mocked(saveWindowStrokes).mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const { result, rerender } = renderHook(
    ({ saved }) => useWindowDrawing("room", saved, vi.fn().mockResolvedValue(undefined)),
    { initialProps: { saved: empty } },
  );
  act(() => {
    result.current.addWindowStroke(a);
  });
  let request!: Promise<void>;
  act(() => {
    request = result.current.saveWindowDrawing();
  });
  await act(() => result.current.saveWindowDrawing());
  expect(saveWindowStrokes).toHaveBeenCalledOnce();
  expect(result.current.addWindowStroke(b)).toBe(false);
  rerender({ saved: { revision: 2, strokes: [a, b] } });
  await act(async () => {
    resolve({ revision: 1, strokes: [a] });
    await request;
  });
  expect(result.current.windowStrokes).toEqual([a, b]);
});

it("treats a received stroke as confirmed even if its HTTP acknowledgement is lost", async () => {
  let reject!: (error: Error) => void;
  vi.mocked(saveWindowStrokes).mockReturnValue(
    new Promise((_done, fail) => {
      reject = fail;
    }),
  );
  const { result, rerender } = renderHook(({ saved }) => useWindowDrawing("room", saved, vi.fn()), {
    initialProps: { saved: empty },
  });
  act(() => {
    result.current.addWindowStroke(a);
  });
  let request!: Promise<void>;
  act(() => {
    request = result.current.saveWindowDrawing();
  });
  rerender({ saved: { revision: 1, strokes: [a] } });
  await act(async () => {
    reject(new Error("offline"));
    await request;
  });
  expect(result.current.windowDrawingError).toBeNull();
  expect(result.current.windowDraft).toEqual([]);
});

it("keeps a confirmed save visible when its refresh fails and does not open an unloaded editor", async () => {
  const { result } = renderHook(() =>
    useWindowDrawing("room", undefined, vi.fn().mockRejectedValue(new Error("offline"))),
  );
  expect(result.current.windowDrawingReady).toBe(false);
  vi.mocked(saveWindowStrokes).mockResolvedValue({ revision: 1, strokes: [a] });
  act(() => {
    result.current.addWindowStroke(a);
  });
  await act(() => result.current.saveWindowDrawing());
  expect(result.current.windowStrokes).toEqual([a]);
  expect(result.current.windowDrawingError).toBeNull();
});
