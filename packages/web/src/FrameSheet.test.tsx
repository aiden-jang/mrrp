// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { FrameSheet } from "./FrameSheet.js";

afterEach(cleanup);

it("keeps the drawing on a failed save and closes only after a successful retry", async () => {
  const onSave = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  render(<FrameSheet current={null} saving={false} onSave={onSave} />);
  fireEvent.click(screen.getByRole("button", { name: "Draw something for the frame" }));
  const first = screen.getByRole("button", { name: /^Row 1, column 1:/ });
  fireEvent.click(first);
  const paintedLabel = first.getAttribute("aria-label");
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Hang it up" })));
  expect(screen.getByRole("button", { name: paintedLabel! })).toBe(first);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Hang it up" })));
  expect(onSave.mock.calls[0]![0]).toBe(onSave.mock.calls[1]![0]);
  expect(screen.queryByRole("group", { name: /^Drawing,/ })).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Draw something for the frame" }));
});

it("uses one Tab stop for the canvas and arrow keys to reach another cell", () => {
  render(<FrameSheet current={null} saving={false} onSave={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Draw something for the frame" }));
  const first = screen.getByRole("button", { name: /^Row 1, column 1:/ });
  expect(document.activeElement).toBe(first);
  fireEvent.keyDown(first, { key: "ArrowRight" });
  const second = screen.getByRole("button", { name: /^Row 1, column 2:/ });
  expect(document.activeElement).toBe(second);
  expect(first.tabIndex).toBe(-1);
  expect(second.tabIndex).toBe(0);
  fireEvent.keyDown(second, { key: "Escape" });
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Draw something for the frame" }));
});
