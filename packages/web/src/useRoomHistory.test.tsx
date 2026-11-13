// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { doUnsay, fetchSaid } from "./api.js";
import type { RoomView, SaidSoFar } from "./types.js";
import { useRoomHistory } from "./useRoomHistory.js";

vi.mock("./api.js", () => ({ doUnsay: vi.fn(), fetchSaid: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);
const view = { them: "Aiden", youAreHer: true } as RoomView;
const said: SaidSoFar = { total: 1, notes: [], lines: [{ at: 1, text: "a line" }] };

it("opens history once while a slow read is pending and reports loading", async () => {
  let finish!: (value: SaidSoFar) => void;
  vi.mocked(fetchSaid).mockReturnValue(new Promise((resolve) => (finish = resolve)));
  const { result } = renderHook(() => useRoomHistory("r", view, vi.fn(), vi.fn()));
  let reading!: Promise<void>;
  act(() => {
    reading = result.current.open();
    void result.current.open();
  });
  expect(fetchSaid).toHaveBeenCalledOnce();
  expect(result.current.loading).toBe(true);
  await act(async () => {
    finish(said);
    await reading;
  });
  expect(result.current.loading).toBe(false);
  expect(result.current.panel).not.toBeNull();
});

it("cannot reopen a closed history panel when taking back a line finishes late", async () => {
  vi.mocked(fetchSaid).mockResolvedValue(said);
  let finish!: (value: RoomView) => void;
  vi.mocked(doUnsay).mockReturnValue(new Promise((resolve) => (finish = resolve)));
  function History() {
    const history = useRoomHistory("r", view, vi.fn(), vi.fn());
    return (
      <>
        <button onClick={() => void history.open()}>Open history</button>
        {history.panel}
      </>
    );
  }
  render(<History />);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Open history" })));
  fireEvent.click(screen.getByRole("button", { name: "take it back" }));
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  await act(async () => finish(view));
  expect(screen.queryByRole("region", { name: "Everything the two of you have said" })).toBeNull();
});
