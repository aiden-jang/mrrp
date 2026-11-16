// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { WindowDrawingSurface, WINDOW_INK_COLORS } from "./WindowDrawingSurface.js";
import { contrast } from "./legible.js";

afterEach(cleanup);

it("records a connected keyboard stroke and finishes it on window blur", () => {
  const onStroke = vi.fn().mockReturnValue(true);
  render(<WindowDrawingSurface strokes={[]} ink="rose" disabled={false} onStroke={onStroke} helpId="help" />);
  const surface = screen.getByRole("application");
  fireEvent.keyDown(surface, { key: "Enter" });
  fireEvent.keyDown(surface, { key: "ArrowRight" });
  fireEvent.keyDown(surface, { key: "ArrowDown" });
  fireEvent(window, new Event("blur"));
  expect(onStroke).toHaveBeenCalledOnce();
  expect(onStroke).toHaveBeenCalledWith(
    expect.objectContaining({
      ink: "rose",
      points: [
        [32, 20],
        [33, 20],
        [33, 21],
      ],
    }),
  );
  fireEvent.keyDown(surface, { key: "Enter" });
  fireEvent.keyDown(surface, { key: "Escape" });
  expect(onStroke).toHaveBeenCalledTimes(2);
});

it("keeps a stroke when the editor cannot accept it yet and blocks new input during a save", () => {
  const onStroke = vi.fn().mockReturnValue(false);
  const view = render(
    <WindowDrawingSurface strokes={[]} ink="ink" disabled={false} onStroke={onStroke} helpId="help" />,
  );
  const surface = screen.getByRole("application");
  fireEvent.keyDown(surface, { key: "Enter" });
  fireEvent.keyDown(surface, { key: "ArrowRight" });
  fireEvent.keyDown(surface, { key: "Enter" });
  expect(surface.querySelectorAll("polyline")).toHaveLength(1);
  view.rerender(<WindowDrawingSurface strokes={[]} ink="ink" disabled onStroke={onStroke} helpId="help" />);
  fireEvent.keyDown(surface, { key: "ArrowRight" });
  expect(surface.querySelector("polyline")?.getAttribute("points")).toBe("32,20 33,20");
});

it("keeps every ink visible against the editor surface", () => {
  for (const color of Object.values(WINDOW_INK_COLORS))
    expect(contrast(color, "#dbe3dc")).toBeGreaterThanOrEqual(3);
});
