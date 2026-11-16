// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { NoteLetter } from "./NoteLetter.js";

vi.mock("./api.js", () => ({ roomFromPath: () => "abc123" }));
afterEach(() => {
  cleanup();
  localStorage.clear();
});
const note = { day: 3, total: 4, text: "Keep your small joys.", final: false };

it("opens the original words and replies to their day", async () => {
  const onReply = vi.fn();
  const ui = render(<NoteLetter note={note} from="Aiden" replying={false} onReply={onReply} />);
  const details = ui.container.querySelector("details")!;
  expect(details.open).toBe(false);
  fireEvent.click(screen.getByText("Open your note"));
  await waitFor(() => expect(details.open).toBe(true));
  expect(screen.getByText(note.text).textContent).toBe(note.text);
  fireEvent.click(screen.getByRole("button", { name: "Say something back" }));
  expect(onReply).toHaveBeenCalledExactlyOnceWith(2);
});

it("returns focus to the reply action when the editor closes", async () => {
  const onReply = vi.fn();
  const ui = render(<NoteLetter note={note} from="Aiden" replying={false} onReply={onReply} />);
  fireEvent.click(screen.getByText("Open your note"));
  await waitFor(() => expect(ui.container.querySelector("details")!.open).toBe(true));
  fireEvent.click(screen.getByRole("button", { name: "Say something back" }));
  ui.rerender(<NoteLetter note={note} from="Aiden" replying={true} onReply={onReply} />);
  ui.rerender(<NoteLetter note={note} from="Aiden" replying={false} onReply={onReply} />);
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Say something back" }));
});
