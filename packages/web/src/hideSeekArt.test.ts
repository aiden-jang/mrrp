// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { room } from "./canvasHarness.js";
import { HIDE_SPOTS } from "./types.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it.each([false, true])("hides every normal cat pixel from the seeker, reduced motion %s", (reduced) => {
  const r = room(
    { role: "him", hideSeek: { id: "round", phase: "hiding", checked: [] } },
    undefined,
    reduced,
  );
  try {
    r.run(0, 1200);
    expect(r.furSpan()).toBeNull();
    r.set({ hideSeek: null });
    r.run(1216, 2000);
    expect(r.furSpan()).not.toBeNull();
  } finally {
    r.unmount();
  }
});

it.each(
  HIDE_SPOTS.flatMap(({ id }) =>
    [false, true].flatMap((reduced) =>
      ["2026-04-02T09:00:00Z", "2026-04-02T03:00:00Z"].map((when) => ({ id, reduced, when })),
    ),
  ),
)("shows ears and a larger found face at $id, reduced $reduced, $when", ({ id, reduced, when }) => {
  const r = room(
    { role: "her", hideSeek: { id: "round", phase: "hiding", checked: [], spot: id } },
    when,
    reduced,
  );
  try {
    r.frame(300);
    const ears = r.count("#ff00ff", 0, 80);
    expect(ears).toBeGreaterThan(0);
    r.set({ hideSeek: { id: "round", phase: "found", checked: [id], spot: id } });
    r.frame(600);
    expect(r.count("#ff00ff", 0, 80)).toBeGreaterThan(ears);
    expect(r.count("#7cb342", 0, 80)).toBeGreaterThan(0);
  } finally {
    r.unmount();
  }
});
