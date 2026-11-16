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
    catGesture: vi.fn(),
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

it("lets her request pets and cancel, then offers nuzzling during contact", () => {
  const { actions, update } = dock({ youAreHer: true, bothHereNow: true });
  fireEvent.click(screen.getByRole("button", { name: "Ask for pets" }));
  expect(actions.catGesture).toHaveBeenLastCalledWith("ask-pets");
  actions.affection = { kind: "ask", at: 1, until: 20_000 };
  update();
  fireEvent.click(screen.getByRole("button", { name: "Never mind" }));
  expect(actions.catGesture).toHaveBeenLastCalledWith("cancel-pets");
  actions.affection = null;
  update({ heldByThem: true });
  fireEvent.click(screen.getByRole("button", { name: "Nuzzle" }));
  expect(actions.catGesture).toHaveBeenLastCalledWith("nuzzle");
});

it("explains why she cannot ask when the companion is away", () => {
  dock({ youAreHer: true, bothHereNow: false });
  expect((screen.getByRole("button", { name: "Ask for pets" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText("You can ask when you’re both here.")).toBeTruthy();
});

it("keeps reactions in a secondary group and sends only her selected reaction", () => {
  const { actions, update } = dock({ youAreHer: true, bothHereNow: true });
  fireEvent.click(screen.getByText("React", { exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "Hide your face" }));
  expect(actions.catGesture).toHaveBeenLastCalledWith("hide-face");
  actions.reaction = { kind: "hide-face", at: 1, until: 3600 };
  update();
  for (const name of ["Dramatic flop", "Hide your face", "Look innocent"]) {
    expect(screen.getByRole("button", { name }).getAttribute("aria-disabled")).toBe("true");
  }
  expect((screen.getByRole("button", { name: "Ask for pets" }) as HTMLButtonElement).disabled).toBe(true);
  vi.mocked(actions.catGesture).mockClear();
  fireEvent.click(screen.getByRole("button", { name: "Look innocent" }));
  expect(actions.catGesture).not.toHaveBeenCalled();
});

it("explains why reactions wait during petting", () => {
  dock({ youAreHer: true, heldByThem: true });
  fireEvent.click(screen.getByText("React", { exact: true }));
  expect(screen.getByRole("button", { name: "Dramatic flop" }).getAttribute("aria-disabled")).toBe("true");
  expect(screen.getByText("You can react once he lets go.")).toBeTruthy();
});

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
  fireEvent.click(screen.getByRole("button", { name: "No box out" }));
  expect(actions.catAct).not.toHaveBeenCalled();
  update({ boxOut: true, box: true });
  fireEvent.click(screen.getByRole("button", { name: "Get out of the box" }));
  expect(actions.catAct).toHaveBeenCalledWith("box");
});
