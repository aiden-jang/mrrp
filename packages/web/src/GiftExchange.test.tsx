// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { GiftExchange } from "./GiftExchange.js";
import type { RoomView } from "./types.js";

afterEach(cleanup);

const base = { cat: { name: "Bean" }, them: "Bean", gift: "leaf", giftId: "first-gift" } as RoomView;

it.each([
  ["leaf", "leaf"],
  ["cap", "bottle cap"],
  ["moth", "moth"],
] as const)("keeps the exact %s that was offered", (gift, name) => {
  const keep = vi.fn();
  render(<GiftExchange view={{ ...base, gift }} pending={false} onKeep={keep} />);
  fireEvent.click(screen.getByRole("button", { name: `Keep the ${name}` }));
  expect(keep).toHaveBeenCalledExactlyOnceWith("first-gift");
});

it("keeps focus on the same control through pending and kept states", () => {
  const keep = vi.fn();
  const ui = render(<GiftExchange view={base} pending={false} onKeep={keep} />);
  const button = screen.getByRole("button", { name: "Keep the leaf" });
  button.focus();
  ui.rerender(<GiftExchange view={base} pending={true} onKeep={keep} />);
  fireEvent.click(screen.getByRole("button", { name: "Keeping…" }));
  expect(keep).not.toHaveBeenCalled();
  ui.rerender(
    <GiftExchange
      view={{ ...base, gift: null, giftId: null, keptGift: { gift: "leaf", at: 1 } }}
      pending={false}
      onKeep={keep}
    />,
  );
  expect(screen.getByRole("status").textContent).toBe("You kept her leaf.");
  expect(screen.getByRole("button", { name: "Kept" })).toBe(document.activeElement);
  fireEvent.click(button);
  expect(keep).not.toHaveBeenCalled();
});

it("only tells her about a real receipt and never gives her a keep button", () => {
  const keep = vi.fn();
  const view = { ...base, youAreHer: true, them: "Aiden", gift: null };
  const ui = render(<GiftExchange view={view} pending={false} onKeep={keep} />);
  expect(screen.queryByRole("status")).toBeNull();
  ui.rerender(
    <GiftExchange view={{ ...view, keptGift: { gift: "cap", at: 1 } }} pending={false} onKeep={keep} />,
  );
  expect(screen.getByRole("status").textContent).toBe("Aiden kept your bottle cap.");
  expect(screen.queryByRole("button")).toBeNull();
});

it("keeps a failed action visible through unrelated room updates", () => {
  const keep = vi.fn();
  const ui = render(
    <GiftExchange view={base} pending={false} onKeep={keep} error="Couldn’t keep that. Try again." />,
  );
  ui.rerender(
    <GiftExchange
      view={{ ...base, heldByThem: true }}
      pending={false}
      onKeep={keep}
      error="Couldn’t keep that. Try again."
    />,
  );
  expect(screen.getByRole("alert").textContent).toBe("Couldn’t keep that. Try again.");
  expect(screen.getByRole("button", { name: "Keep the leaf" }).getAttribute("aria-disabled")).toBe("false");
});
