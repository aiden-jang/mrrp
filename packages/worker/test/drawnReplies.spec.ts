import { SELF } from "cloudflare:test";
import { expect, it } from "vitest";
import { harness, HER, HIM, STRANGER } from "./harness.js";
import type { SaidSoFar } from "../src/types.js";
const h = harness("drawnreplyroom");
const drawing = "1" + "0".repeat(134);
const history = async () =>
  (await (await SELF.fetch(`https://x/api/room/${h.id}/said?me=${HIM}`)).json()) as SaidSoFar;

it("saves a drawing-only answer with its note, keeps the frame, and survives reload", async () => {
  await h.seat();
  await h.post("notes", { me: HIM, notes: ["A note for you."] });
  await h.post("draw", { me: HIM, cells: "2".repeat(135) });
  await h.post("say", { me: HER, text: "", aboutDay: 0, drawing });
  for (const me of [HER, HIM]) {
    const view = await h.view(me);
    expect(view.herLine).toMatchObject({ text: "", drawing, about: "A note for you." });
    expect(view.doodle?.cells).toBe("2".repeat(135));
  }
  expect((await history()).notes[0]!.answers[0]).toMatchObject({ drawing });
  expect((await h.view(STRANGER)).herLine).toBeNull();
});

it("preserves the drawing and original quote when he later rewrites the note", async () => {
  await h.seat();
  await h.post("notes", { me: HIM, notes: ["Original words."] });
  await h.post("say", { me: HER, text: "a tiny answer", aboutDay: 0, drawing });
  await h.post("notes", { me: HIM, notes: ["New words."] });
  const saved = await history();
  expect(saved.notes[0]!.answers).toEqual([]);
  expect(saved.lines[0]).toMatchObject({ drawing, about: "Original words." });
});

it("only lets her send a drawn reply and rejects invalid drawings without clearing history", async () => {
  await h.seat();
  await h.post("say", { me: HER, text: "keep this" });
  for (const me of [HIM, STRANGER]) await h.post("say", { me, text: "", drawing });
  for (const bad of [7, null, "x".repeat(135), "1".repeat(134), "1".repeat(136)])
    expect((await h.post("say", { me: HER, text: "", drawing: bad })).status).toBe(400);
  await h.post("say", { me: HER, text: "", drawing: "0".repeat(135) });
  expect((await h.view(HIM)).herLine?.text).toBe("keep this");
});

it("supports taking back one drawing, clearing all replies, and leaving and restoring her side", async () => {
  await h.seat();
  await h.post("say", { me: HER, text: "", drawing });
  const at = (await h.view(HIM)).herLine!.at;
  await h.post("unsay", { me: HER, at });
  expect((await h.view(HIM)).herLine).toBeNull();
  await h.post("say", { me: HER, text: "with you", drawing });
  await h.post("leave", { me: HER });
  expect((await h.view(HIM)).herLine).toBeNull();
  await h.post("unleave", { me: HER });
  expect((await h.view(HIM)).herLine?.drawing).toBe(drawing);
  await h.post("say", { me: HER, text: "" });
  expect((await h.view(HIM)).herLine).toBeNull();
});
