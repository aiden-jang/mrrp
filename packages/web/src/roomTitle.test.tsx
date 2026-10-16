// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { DocTitle } from "./RoomEffects";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
test("only a new reply while away marks the tab, and returning clears it without a read receipt", () => {
  let hidden = true;
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  const { rerender, unmount } = render(<DocTitle name="Bean" replyAt={100} />);
  expect(document.title).toBe("Bean · mrrp");
  rerender(<DocTitle name="Bean" replyAt={200} />);
  expect(document.title).toBe("• Bean · mrrp");
  rerender(<DocTitle name="Bean" replyAt={200} />);
  expect(document.title).toBe("• Bean · mrrp");
  hidden = false;
  document.dispatchEvent(new Event("visibilitychange"));
  expect(document.title).toBe("Bean · mrrp");
  hidden = true;
  rerender(<DocTitle name="Bean" replyAt={100} />);
  expect(document.title).toBe("Bean · mrrp");
  rerender(<DocTitle name="Bean" replyAt={null} />);
  rerender(<DocTitle name="Bean" replyAt={200} />);
  expect(document.title).toBe("Bean · mrrp");
  unmount();
  expect(document.title).toBe("mrrp");
});
