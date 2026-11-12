// @vitest-environment jsdom
import { act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { room, type Room } from "./canvasHarness.js";

let current: Room | null = null;
afterEach(() => {
  current?.unmount();
  current = null;
});

function pointerEnvironment() {
  vi.stubGlobal("PointerEvent", MouseEvent);
  vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    width: 480,
    height: 480,
    right: 480,
    bottom: 480,
    toJSON: () => ({}),
  });
}

describe("the redrawn room's targets", () => {
  it("taps the enlarged window below its original bounds", () => {
    const touch = vi.fn();
    current = room({ onTouch: touch });
    pointerEnvironment();
    current.run(0, 300);
    act(() =>
      document
        .querySelector("canvas")!
        .dispatchEvent(new MouseEvent("pointerdown", { clientX: 420, clientY: 108 })),
    );
    expect(touch).toHaveBeenCalledWith("window");
  });

  it("taps the relocated cabinet", () => {
    const touch = vi.fn();
    current = room({ onTouch: touch });
    pointerEnvironment();
    current.run(0, 300);
    act(() =>
      document
        .querySelector("canvas")!
        .dispatchEvent(new MouseEvent("pointerdown", { clientX: 462, clientY: 252 })),
    );
    expect(touch).toHaveBeenCalledWith("shelf");
  });

  it.each(["window", "frame", "shelf", "door", "plant", "bed", "box"])(
    "activates %s from its named keyboard control even when another object overlaps",
    (key) => {
      const touch = vi.fn();
      let poke: ((key: string) => void) | undefined;
      current = room(
        {
          onTouch: touch,
          onProps: (_props, action) => {
            poke = action;
          },
          box: true,
          boxOut: true,
          role: "him",
        },
        "2026-04-02T23:00:00Z",
      );
      pointerEnvironment();
      current.run(0, 300);
      act(() => poke!(key));
      expect(touch).toHaveBeenCalledWith(key);
    },
  );
});
