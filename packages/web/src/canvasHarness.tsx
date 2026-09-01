import { act, render } from "@testing-library/react";
import { vi } from "vitest";
import { Cat } from "./Cat.js";
import type { Cat as CatLook, Clock } from "./types.js";

// Drives the room's draw loop frame by frame and reads the pixels back, so what the cat does can be
// tested without anybody watching it.

const TEST_FUR = "#ff00ff";
const TEST_FUR_DK = "#cc00cc";
// No camera reading on purpose. Finding a fixed prop and subtracting locks onto the outline colour,
// which everything in the room shares.
export const SHELF_WOOD = "#8a6a48";

/* Her fur is mixed toward the light before it is drawn, so an exact match finds her only at night. */
function looksLikeFur(hex: string): boolean {
  if (!hex.startsWith("#") || hex.length !== 7) return false;
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return r > 150 && b > 120 && g < Math.min(r, b) - 60;
}

const LOOK: CatLook = {
  name: "Bean",
  fur: TEST_FUR,
  furDk: TEST_FUR_DK,
  belly: "#fbf0dd",
  eyes: "#7cb342",
  tabby: false,
};

export interface Room {
  frame: (at: number) => void;
  // Run frames from `from` to `to`. She eases 5% of the way toward where she wants to be each frame, so
  // ask for enough of them.
  run: (from: number, to: number, step?: number) => void;
  /* Change a prop mid-run, which is how anything happens to a room that is already open. */
  set: (next: Partial<Parameters<typeof Cat>[0]>) => void;
  at: (x: number, y: number) => string | null;
  furSpan: () => [number, number] | null;
  count: (colour: string, y0: number, y1: number) => number;
  unmount: () => void;
}

/* Read `scale` off the canvas rather than predicting it: the rule it follows is under test. */
export function room(props: Partial<Parameters<typeof Cat>[0]> = {}, when = "2026-04-02T09:00:00Z"): Room {
  // One cell per fill, not one device pixel. Every fill is one cell, and storing device pixels is
  // 160,000 writes a frame, which times the test out.
  const grid: (string | null)[] = new Array(80 * 80).fill(null);
  let scale = 1;

  const context = {
    fillStyle: "",
    fillRect(x: number, y: number) {
      const cx = Math.floor(x / scale);
      const cy = Math.floor(y / scale);
      if (cx >= 0 && cx < 80 && cy >= 0 && cy < 80) grid[cy * 80 + cx] = this.fillStyle;
    },
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as never);

  // What the room reaches for and jsdom lacks. Reduced motion off, or she skips most of this.
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );

  // One clock for both. The room stamps a moment with `performance.now` outside the loop and compares
  // it to the frame's own time.
  let now = 0;
  vi.stubGlobal("performance", { now: () => now });

  const pending: FrameRequestCallback[] = [];
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => pending.push(cb));
  vi.stubGlobal("cancelAnimationFrame", () => {});

  // Pin the clock. The room is drawn from the hour, down to where she sits, so on the real clock a test
  // about her walking would pass all day and fail at midnight.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(when));
  const clock: Clock = { tz: "UTC", homeHour: 18 };
  let live = props;
  const draw = (p: Partial<Parameters<typeof Cat>[0]>) => (
    <Cat label="room" look={LOOK} clock={clock} mood={null} nudge={0} {...p} />
  );
  const view = render(draw(live));
  const canvas = view.container.querySelector("canvas")!;
  scale = Math.max(1, Math.round(canvas.width / 80));

  const frame = (at: number) => {
    now = at;
    const due = pending.splice(0, pending.length);
    act(() => {
      for (const cb of due) cb(at);
    });
  };
  // The first frame is what the mount scheduled; without it nothing has been painted at all.
  frame(0);

  const at = (x: number, y: number) => (x >= 0 && x < 80 && y >= 0 && y < 80 ? grid[y * 80 + x] : null);

  const run = (from: number, to: number, step = 16) => {
    for (let t = from; t <= to; t += step) frame(t);
  };

  return {
    frame,
    run,
    set: (next) => {
      live = { ...live, ...next };
      act(() => view.rerender(draw(live)));
    },
    at,
    furSpan: () => {
      let lo = 99;
      let hi = -1;
      for (let y = 0; y < 80; y++) {
        for (let x = 0; x < 80; x++) {
          const c = at(x, y);
          if (c !== null && looksLikeFur(c)) {
            if (x < lo) lo = x;
            if (x > hi) hi = x;
          }
        }
      }
      return hi < 0 ? null : [lo, hi];
    },
    count: (colour, y0, y1) => {
      let n = 0;
      for (let y = y0; y <= y1; y++) for (let x = 0; x < 80; x++) if (at(x, y) === colour) n++;
      return n;
    },
    unmount: () => {
      view.unmount();
      vi.useRealTimers();
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    },
  };
}
