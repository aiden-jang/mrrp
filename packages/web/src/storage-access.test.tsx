// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { App } from "./App.js";
vi.mock("./Cat.js", () => ({ Cat: () => null }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it.each(["getItem", "setItem"] as const)("offers recovery when browser storage %s is blocked", (method) => {
  const blocked = vi.spyOn(Storage.prototype, method).mockImplementation(() => {
    throw new DOMException("Blocked", "SecurityError");
  });
  render(<App />);
  expect(screen.getByRole("heading", { name: "This browser can’t keep your seat yet." })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Make a room" })).toBeNull();
  blocked.mockRestore();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(screen.getByRole("button", { name: "Make a room" })).toBeTruthy();
});
