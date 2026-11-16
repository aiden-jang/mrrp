// @vitest-environment jsdom
import { act } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { room, type Room } from "./canvasHarness.js";

let current: Room | null = null;
afterEach(() => {
  current?.unmount();
  current = null;
});

function setup(brushing = false) {
  const onHold = vi.fn();
  const onPet = vi.fn();
  const onStroke = vi.fn();
  current = room({ role: "him", brushing, onHold, onPet, onStroke });
  vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    width: 480,
    height: 480,
  } as DOMRect);
  current.run(0, 400);
  const span = current.furSpan()!;
  expect(span).not.toBeNull();
  const x = (span[0] + span[1]) / 2;
  const canvas = document.querySelector("canvas")!;
  const pointer = (type: string, px = x, id = 1, target: EventTarget = canvas) => {
    const event = new MouseEvent(type, { clientX: px * 6, clientY: 59 * 6, bubbles: true });
    Object.defineProperty(event, "pointerId", { value: id });
    act(() => target.dispatchEvent(event));
  };
  return { onHold, onPet, onStroke, pointer, x };
}

it("requires a press before brushing and ends the stroke on release", () => {
  const { pointer, x, onStroke } = setup(true);
  for (let i = 0; i < 8; i++) pointer("pointermove", x + (i % 2 ? 6 : -6));
  expect(onStroke).not.toHaveBeenCalled();
  pointer("pointerdown");
  for (let i = 0; i < 8; i++) pointer("pointermove", x + (i % 2 ? 6 : -6));
  expect(onStroke).toHaveBeenCalled();
  pointer("pointerup");
  const strokes = onStroke.mock.calls.length;
  for (let i = 0; i < 8; i++) pointer("pointermove", x + (i % 2 ? 6 : -6));
  expect(onStroke).toHaveBeenCalledTimes(strokes);
});

it.each(["blur", "offline"])("releases a pet when the window emits %s", (event) => {
  const { pointer, onHold, onPet } = setup();
  pointer("pointerdown");
  expect(onHold).toHaveBeenCalledExactlyOnceWith(true);
  expect(onPet).toHaveBeenCalledExactlyOnceWith(true);
  act(() => window.dispatchEvent(new Event(event)));
  expect(onHold.mock.calls).toEqual([[true], [false]]);
  pointer("pointerup");
  expect(onHold).toHaveBeenCalledTimes(2);
});

it("ignores a second pointer and releases even outside the canvas", () => {
  const { pointer, onHold } = setup();
  pointer("pointerdown");
  pointer("pointerdown", undefined, 2);
  pointer("pointerup", undefined, 2, window);
  expect(onHold.mock.calls).toEqual([[true]]);
  pointer("pointerup", undefined, 1, window);
  expect(onHold.mock.calls).toEqual([[true], [false]]);
});

it("releases a pet when the canvas unmounts", () => {
  const { pointer, onHold } = setup();
  pointer("pointerdown");
  current!.unmount();
  current = null;
  expect(onHold.mock.calls).toEqual([[true], [false]]);
});

it("brushes from the keyboard without requiring a pointer gesture", () => {
  const { onStroke, onHold } = setup(true);
  act(() => document.querySelector("canvas")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" })));
  expect(onStroke).toHaveBeenCalledOnce();
  expect(onHold).not.toHaveBeenCalled();
});

it("cancels interrupted brushing", () => {
  const { pointer, x, onStroke } = setup(true);
  pointer("pointerdown");
  pointer("pointercancel");
  for (let i = 0; i < 8; i++) pointer("pointermove", x + (i % 2 ? 6 : -6));
  expect(onStroke).not.toHaveBeenCalled();
});

it("routes a keyboard pet to the timed button interaction", () => {
  const { onPet, onHold } = setup();
  act(() => document.querySelector("canvas")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" })));
  expect(onPet).toHaveBeenCalledExactlyOnceWith();
  expect(onHold).not.toHaveBeenCalled();
});
