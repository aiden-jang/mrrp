import { act, render } from "@testing-library/react";
import { vi } from "vitest";
import { Cat } from "./Cat.js";
import type { Cat as CatLook, Clock } from "./types.js";

/*
 * Drives the room's draw loop frame by frame and reads the pixels back.
 *
 * The whole of the canvas is `fillStyle` and `fillRect`, so a recording context is enough and beats
 * a real one: no native dependency, and the grid is exact rather than sampled.
 *
 * This exists because the room's one untestable surface was anything that moves. Layering could be
 * checked by hand in a browser, badly; timing could not be checked at all, because an automated
 * browser keeps its tabs hidden and a hidden tab renders a handful of frames and then freezes.
 */

/** Wide enough to make the grid unmistakable, and never a colour the room draws on its own. */
export const TEST_FUR = "#ff00ff";
export const TEST_FUR_DK = "#cc00cc";
/*
 * Deliberately no camera reading.
 *
 * The obvious one, find a fixed prop and subtract, does not work: the outline colour is shared by
 * everything in the room, so it locks onto whatever is leftmost. Assert on what a person would
 * actually notice instead, which is how much of a thing is on screen.
 */
export const SHELF_WOOD = "#8a6a48";

/*
 * Her fur is mixed toward the light before it is drawn, up to about a quarter of the way, so an
 * exact match finds her only in the dark. Magenta survives that: nothing else in the room has red
 * and blue both high with green low, whatever the hour does to it.
 */
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
  /** Run one frame at this many ms since the room mounted. */
  frame: (at: number) => void;
  /**
   * Run frames from `from` to `to`, which is usually what you want.
   *
   * Nothing about her position is instant: she eases 5% of the way toward where she wants to be per
   * frame, so a walk across the room needs sixty-odd frames. A test that steps straight from 0ms to
   * 2000ms in one frame moves her 5% and proves nothing.
   */
  run: (from: number, to: number, step?: number) => void;
  /**
   * Change a prop mid-run, which is how anything that happens to a room already open happens.
   *
   * Mount-time is not the same thing and can mislead: her position initialises to wherever she wants
   * to be on the first frame, so a moment that is already running at mount puts her at the far end
   * of it rather than walking there.
   */
  set: (next: Partial<Parameters<typeof Cat>[0]>) => void;
  /** The colour at a viewport cell, or null where nothing was painted. */
  at: (x: number, y: number) => string | null;
  /** Viewport columns containing her fur, or null when she is not on screen. */
  furSpan: () => [number, number] | null;
  /** How many cells of this colour are painted anywhere in the band. */
  count: (colour: string, y0: number, y1: number) => number;
  unmount: () => void;
}

/*
 * `scale` has to match what the component computes, or every read is off by a row.
 *
 * It takes the largest whole number of device pixels per cell that fits, which in jsdom comes out of
 * `innerHeight` because the container measures zero. Read it back off the canvas rather than
 * predicting it: the rule it follows is exactly the thing a test should not be duplicating.
 */
export function room(props: Partial<Parameters<typeof Cat>[0]> = {}, when = "2026-04-02T09:00:00Z"): Room {
  /*
   * Recorded one logical cell per fill, not one device pixel.
   *
   * Every fill comes from the room's `px`, which paints exactly one cell, so the cell is all the
   * information there is. Storing device pixels instead means a hundred and sixty thousand writes a
   * frame, which turned a hundred-frame test into a timeout.
   */
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

  /*
   * The handful of browser APIs the room reaches for that jsdom does not have. Reduced motion is
   * forced off: with it on she skips most of what these tests are about.
   */
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

  /*
   * One clock for both. In a browser the timestamp handed to a frame callback and `performance.now`
   * share an origin, and the room relies on that: a moment is stamped with `performance.now` outside
   * the loop and compared against the frame's `t` inside it. Two clocks here would make every such
   * comparison come out as "hugely negative", which is to say "not happening".
   */
  let now = 0;
  vi.stubGlobal("performance", { now: () => now });

  const pending: FrameRequestCallback[] = [];
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => pending.push(cb));
  vi.stubGlobal("cancelAnimationFrame", () => {});

  /*
   * A pinned clock, and one a test can choose. The room is drawn from the hour: where she sits, how
   * bright it is, whether she is asleep. Left to the real one, a test asserting she walked somewhere
   * passes or fails by time of day, which is how this harness first went wrong. `when` matters if a
   * test is about her moving, because it decides where she starts.
   */
  // Only Date. Faking the timers wholesale replaces requestAnimationFrame with vitest's own, which
  // silently takes over the frame queue below and nothing is ever painted.
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
