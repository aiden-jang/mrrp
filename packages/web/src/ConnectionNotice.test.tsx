// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { ConnectionNotice } from "./ConnectionNotice.js";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
test("a stale socket does not pretend the room is live, and reconnect feedback clears on recovery", () => {
  let online = true;
  vi.spyOn(navigator, "onLine", "get").mockImplementation(() => online);
  const view = render(<ConnectionNotice live="closed" />);
  expect(screen.getByRole("status").textContent).toContain("every 15 seconds");
  online = false;
  fireEvent.offline(window);
  expect(screen.getByRole("status").textContent).toContain("You’re offline");
  online = true;
  fireEvent.online(window);
  view.rerender(<ConnectionNotice live="open" />);
  expect(screen.queryByRole("status")).toBeNull();
});
