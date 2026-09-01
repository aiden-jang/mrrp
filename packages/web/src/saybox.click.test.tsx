// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SayBox } from "./screens.js";

afterEach(cleanup);

const box = (over: Partial<Parameters<typeof SayBox>[0]> = {}) => {
  const props = {
    value: "",
    max: 140,
    answering: null,
    him: "him",
    saving: false,
    canClear: true,
    clearing: false,
    onChange: vi.fn(),
    onSave: vi.fn(),
    onNeverMind: vi.fn(),
    onClearTap: vi.fn(),
    ...over,
  };
  render(<SayBox {...props} />);
  return props;
};

describe("the box she says something in", () => {
  it("will not let her save an empty one, because that clears every line she has left him", () => {
    box();
    expect((screen.getByRole("button", { name: "Leave it" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("will not take a box of only spaces either", () => {
    box({ value: "   " });
    expect((screen.getByRole("button", { name: "Leave it" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("saves once she has actually written something", () => {
    const props = box({ value: "still true" });
    fireEvent.click(screen.getByRole("button", { name: "Leave it" }));
    expect(props.onSave).toHaveBeenCalledOnce();
  });

  it("asks before taking everything back, rather than doing it on the first tap", () => {
    box({ clearing: false });
    expect(screen.getByRole("button", { name: "Take back everything you've said" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Sure/ })).toBeNull();
  });

  it("asks out loud once it is armed, so the second tap is not a blind one", () => {
    const props = box({ clearing: true });
    fireEvent.click(screen.getByRole("button", { name: "Sure? All of it goes." }));
    expect(props.onClearTap).toHaveBeenCalledOnce();
  });

  it("only offers to take it back when there is something to take back", () => {
    box({ canClear: false });
    expect(screen.queryByRole("button", { name: /Take back everything/ })).toBeNull();
  });

  it("says which note she is answering, so she is not replying into the dark", () => {
    box({ answering: "you always take the long way home" });
    expect(screen.getByText(/you always take the long way home/)).toBeTruthy();
  });
});
