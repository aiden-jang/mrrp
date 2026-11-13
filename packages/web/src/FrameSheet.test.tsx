// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { FrameSheet } from "./FrameSheet.js";

afterEach(cleanup);

function pointer(target: HTMLElement | Window, type: string, pointerId: number) {
  const event = new Event(type, { bubbles: true });
  Object.defineProperty(event, "pointerId", { value: pointerId });
  fireEvent(target, event);
}

it("pauses drawing controls while the current draft is being saved", () => {
  const onSave = vi.fn();
  const { rerender } = render(<FrameSheet current={null} saving={false} onSave={onSave} />);
  fireEvent.click(screen.getByRole("button", { name: "Draw something for the frame" }));
  fireEvent.click(screen.getByLabelText(/^Row 1, column 1:/));
  rerender(<FrameSheet current={null} saving={true} onSave={onSave} />);
  expect((screen.getByLabelText(/^Row 1, column 2:/) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole("button", { name: "Clear" }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole("button", { name: "rose" }) as HTMLButtonElement).disabled).toBe(true);
});

it("keeps the drawing on a failed save and closes only after a successful retry", async () => {
  const onSave = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  render(<FrameSheet current={null} saving={false} onSave={onSave} />);
  fireEvent.click(screen.getByRole("button", { name: "Draw something for the frame" }));
  const first = screen.getByLabelText(/^Row 1, column 1:/);
  fireEvent.click(first);
  const paintedLabel = first.getAttribute("aria-label");
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Hang it up" })));
  expect(screen.getByLabelText(paintedLabel!)).toBe(first);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Hang it up" })));
  expect(onSave.mock.calls[0]![0]).toBe(onSave.mock.calls[1]![0]);
  expect(screen.queryByRole("group", { name: /^Drawing,/ })).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Draw something for the frame" }));
});

it("uses one Tab stop for the canvas and arrow keys to reach another cell", () => {
  render(<FrameSheet current={null} saving={false} onSave={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Draw something for the frame" }));
  const first = screen.getByLabelText(/^Row 1, column 1:/);
  expect(document.activeElement).toBe(first);
  fireEvent.keyDown(first, { key: "ArrowRight" });
  const second = screen.getByLabelText(/^Row 1, column 2:/);
  expect(document.activeElement).toBe(second);
  expect(first.tabIndex).toBe(-1);
  expect(second.tabIndex).toBe(0);
  fireEvent.keyDown(second, { key: "Escape" });
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Draw something for the frame" }));
});

it("undoes a complete stroke and can undo clearing the drawing", () => {
  render(<FrameSheet current={null} saving={false} onSave={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Draw something for the frame" }));
  const first = screen.getByLabelText(/^Row 1, column 1:/);
  const second = screen.getByLabelText(/^Row 1, column 2:/);
  pointer(first, "pointerdown", 1);
  pointer(second, "pointerover", 1);
  pointer(window, "pointerup", 1);
  fireEvent.click(screen.getByRole("button", { name: "Clear" }));
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(first.getAttribute("aria-label")).toContain("ink");
  expect(second.getAttribute("aria-label")).toContain("ink");
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(first.getAttribute("aria-label")).toContain("rub out");
  expect(second.getAttribute("aria-label")).toContain("rub out");
});

it("ends an interrupted stroke when the window loses focus", () => {
  render(<FrameSheet current={null} saving={false} onSave={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Draw something for the frame" }));
  const first = screen.getByLabelText(/^Row 1, column 1:/);
  const second = screen.getByLabelText(/^Row 1, column 2:/);
  pointer(first, "pointerdown", 1);
  fireEvent.blur(window);
  pointer(second, "pointerover", 1);
  expect(second.getAttribute("aria-label")).toContain("rub out");
  pointer(second, "pointerdown", 2);
  pointer(window, "pointerup", 2);
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(first.getAttribute("aria-label")).toContain("ink");
  expect(second.getAttribute("aria-label")).toContain("rub out");
});

it("ignores another pointer until the current stroke ends", () => {
  render(<FrameSheet current={null} saving={false} onSave={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Draw something for the frame" }));
  const first = screen.getByLabelText(/^Row 1, column 1:/);
  const second = screen.getByLabelText(/^Row 1, column 2:/);
  pointer(first, "pointerdown", 1);
  pointer(second, "pointerdown", 2);
  pointer(window, "pointerup", 2);
  expect(second.getAttribute("aria-label")).toContain("rub out");
  pointer(second, "pointerover", 1);
  expect(second.getAttribute("aria-label")).toContain("ink");
  pointer(window, "pointerup", 1);
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(first.getAttribute("aria-label")).toContain("rub out");
  expect(second.getAttribute("aria-label")).toContain("rub out");
});
