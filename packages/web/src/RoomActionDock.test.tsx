// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { RoomActionDock } from "./RoomActionDock.js";
import type { RoomView } from "./types.js";
import type { useRoomActions } from "./useRoomActions.js";

afterEach(cleanup);

function dock(override: Partial<RoomView> = {}) {
  let view = { cat: { name: "Bean" }, youAreHer: false, sittingWith: false, ...override } as RoomView;
  const actions = {
    strokes: null,
    photoOver: false,
    setStrokes: vi.fn(),
    setPhotoOver: vi.fn(),
    sitWith: vi.fn(),
    act: vi.fn(),
    waitAtDoor: vi.fn(),
    settleIn: vi.fn(),
    catAct: vi.fn(),
  } as unknown as ReturnType<typeof useRoomActions>;
  const ui = () => <RoomActionDock view={view} actions={actions} did={null} />;
  const rendered = render(ui());
  return {
    actions,
    update(next: Partial<RoomView> = {}) {
      view = { ...view, ...next };
      rendered.rerender(ui());
    },
  };
}

it("requires confirmation before a photo takes down their drawing", () => {
  const { actions, update } = dock({ doodle: { cells: "1".repeat(135), mine: true, at: 1 } });
  fireEvent.click(screen.getByRole("button", { name: "Take her photo" }));
  expect(actions.act).not.toHaveBeenCalled();
  expect(actions.setPhotoOver).toHaveBeenCalledWith(true);
  actions.photoOver = true;
  update();
  fireEvent.click(screen.getByRole("button", { name: "That takes her drawing down" }));
  expect(actions.act).toHaveBeenCalledWith("photo");
  expect(actions.setPhotoOver).toHaveBeenLastCalledWith(false);
});

it("keeps sitting reversible and starts brushing without sending an action", () => {
  const { actions, update } = dock();
  fireEvent.click(screen.getByRole("button", { name: "Sit with her" }));
  expect(actions.sitWith).toHaveBeenLastCalledWith(true);
  update({ sittingWith: true });
  fireEvent.click(screen.getByRole("button", { name: "Get up" }));
  expect(actions.sitWith).toHaveBeenLastCalledWith(false);
  fireEvent.click(screen.getByRole("button", { name: "Brush her" }));
  expect(actions.setStrokes).toHaveBeenCalledWith(0);
  expect(actions.act).not.toHaveBeenCalled();
});

it("settles into company instead of sending the cat to the door", () => {
  const { actions, update } = dock({ youAreHer: true, sittingWithYou: true, settled: false });
  fireEvent.click(screen.getByRole("button", { name: "Settle into it" }));
  expect(actions.settleIn).toHaveBeenLastCalledWith(true);
  expect(actions.waitAtDoor).not.toHaveBeenCalled();
  update({ settled: true });
  fireEvent.click(screen.getByRole("button", { name: "Settled" }));
  expect(actions.settleIn).toHaveBeenLastCalledWith(false);
});

it("requires a box to be out and offers a way out once she is inside", () => {
  const { actions, update } = dock({ youAreHer: true, boxOut: false, box: false });
  fireEvent.click(screen.getByRole("button", { name: "no box to get into" }));
  expect(actions.catAct).not.toHaveBeenCalled();
  update({ boxOut: true, box: true });
  fireEvent.click(screen.getByRole("button", { name: "Get out of the box" }));
  expect(actions.catAct).toHaveBeenCalledWith("box");
});
