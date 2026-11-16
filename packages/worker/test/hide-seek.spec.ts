import { env, runInDurableObject, SELF } from "cloudflare:test";
import { expect, it } from "vitest";
import { harness, HER, HIM, STRANGER } from "./harness.js";
import { HIDE_SPOTS, type HideSeekCommand, type RoomView } from "../src/types.js";

const h = harness("hideseekroom");
const seek = (me: string, command: HideSeekCommand) => h.post("seek", { me, command });
const start = async (spot: HideSeekCommand["spot"] = "curtain") => {
  expect((await seek(HER, { kind: "hide", round: null, spot })).status).toBe(200);
  return (await h.view(HER)).hideSeek!;
};

it.each(HIDE_SPOTS)(
  "keeps $id private until he finds her, without changing history or mood",
  async ({ id }) => {
    await h.seat();
    await h.post("tell", { me: HER, mood: "feral" });
    const before = await h.view(HIM);
    const game = await start(id);
    expect(game.spot).toBe(id);
    const hidden = (await h.view(HIM)).hideSeek!;
    expect(hidden).toEqual({ id: game.id, phase: "hiding", checked: [] });
    expect(JSON.stringify(hidden)).not.toContain(HER);
    expect((await h.view(STRANGER)).hideSeek).toBeNull();
    const wrong = HIDE_SPOTS.find((s) => s.id !== id)!.id;
    expect((await seek(HIM, { kind: "search", round: game.id, spot: wrong })).status).toBe(200);
    expect((await h.view(HIM)).hideSeek).toEqual({ ...hidden, checked: [wrong] });
    expect((await seek(HIM, { kind: "search", round: game.id, spot: id })).status).toBe(200);
    const found = await h.view(HIM);
    expect(found.hideSeek).toEqual({ id: game.id, phase: "found", spot: id, checked: [wrong, id] });
    expect(found.catMood).toBe("feral");
    expect(found.theirRecent).toEqual(before.theirRecent);
    expect(found.personality).toEqual(before.personality);
  },
);

it("enforces roles, one fixed spot per round, and malformed input", async () => {
  await h.seat();
  for (const me of [HIM, STRANGER])
    expect((await seek(me, { kind: "hide", round: null, spot: "curtain" })).status).toBe(409);
  const game = await start();
  expect((await seek(HER, { kind: "hide", round: game.id, spot: "cabinet" })).status).toBe(409);
  for (const me of [HER, STRANGER])
    expect((await seek(me, { kind: "search", round: game.id, spot: "curtain" })).status).toBe(409);
  expect((await seek(STRANGER, { kind: "end", round: game.id })).status).toBe(409);
  for (const command of [
    null,
    {},
    { kind: "search", round: game.id, spot: "floor" },
    { kind: "hide", spot: "curtain" },
  ])
    expect((await h.post("seek", { me: HER, command })).status).toBe(400);
  expect((await h.view(HER)).hideSeek).toEqual(game);
});

it.each([HER, HIM])("lets %s end a round, and ignores requests from an earlier round", async (me) => {
  await h.seat();
  const first = await start();
  expect((await seek(me, { kind: "end", round: first.id })).status).toBe(200);
  expect((await h.view(HIM)).hideSeek).toBeNull();
  const next = await start("cabinet");
  expect((await seek(HIM, { kind: "search", round: first.id, spot: "cabinet" })).status).toBe(409);
  expect((await seek(me, { kind: "end", round: first.id })).status).toBe(409);
  expect((await h.view(HER)).hideSeek).toEqual(next);
});

it("waits for contact or a reaction to finish and blocks conflicting normal actions", async () => {
  await h.seat();
  await h.post("hold", { me: HIM, on: true });
  expect((await seek(HER, { kind: "hide", round: null, spot: "curtain" })).status).toBe(409);
  await h.post("hold", { me: HIM, on: false });
  await h.post("heract", { me: HER, act: "flop" });
  expect((await seek(HER, { kind: "hide", round: null, spot: "curtain" })).status).toBe(409);
  h.away(4 / 3600);
  const game = await start();
  await h.post("hold", { me: HIM, on: true });
  await h.post("heract", { me: HER, act: "innocent" });
  await h.post("act", { me: HIM, action: "pet" });
  await h.post("wait", { me: HER, on: true });
  await h.post("sit", { me: HIM, on: true });
  const view = await h.view(HER);
  expect(view.hideSeek).toEqual(game);
  expect(view.heldByThem).toBe(false);
  expect(view.reaction).toBeNull();
  expect(view.waitingAtDoor).toBe(false);
  expect(view.sittingWithYou).toBe(false);
});

it("preserves the round across key rotation and clears it when her seat leaves", async () => {
  await h.seat();
  const game = await start("cushion");
  const next = "replacementherkey";
  expect((await h.post("rotate", { me: HER, next })).status).toBe(200);
  expect((await h.view(next)).hideSeek).toEqual(game);
  expect((await h.view(HIM)).hideSeek?.spot).toBeUndefined();
  await h.post("leave", { me: next });
  await h.post("unleave", { me: next });
  expect((await h.view(next)).hideSeek).toBeNull();
  await runInDurableObject(env.ROOM.get(env.ROOM.idFromName(h.id)), async (_room, state) => {
    expect(await state.storage.get("hideSeek")).toBeUndefined();
  });
});

it("pushes a separate hidden view to his live socket and reveals only on a correct search", async () => {
  await h.seat();
  const response = await SELF.fetch(`https://x/api/room/${h.id}/live?me=${HIM}`, {
    headers: { upgrade: "websocket" },
  });
  const ws = response.webSocket!;
  const views: RoomView[] = [];
  ws.accept();
  ws.addEventListener("message", (event) => {
    if (typeof event.data === "string" && event.data !== "pong")
      views.push(JSON.parse(event.data).view as RoomView);
  });
  try {
    const game = await start();
    await expect.poll(() => views.at(-1)?.hideSeek?.phase).toBe("hiding");
    expect(views.filter((v) => v.hideSeek).every((v) => v.hideSeek?.spot === undefined)).toBe(true);
    await seek(HIM, { kind: "search", round: game.id, spot: "curtain" });
    await expect.poll(() => views.at(-1)?.hideSeek?.spot).toBe("curtain");
  } finally {
    ws.close();
  }
});

it("ends the game when her seat is replaced and lets the new cat choose her own spot", async () => {
  await h.seat();
  await start();
  await h.post("release", { me: HIM });
  expect((await h.view(HIM)).hideSeek).toBeNull();
  expect((await h.view(STRANGER)).hideSeek).toBeNull();
  expect((await seek(STRANGER, { kind: "hide", round: null, spot: "cabinet" })).status).toBe(200);
  expect((await h.view(STRANGER)).hideSeek?.spot).toBe("cabinet");
  expect((await h.view(HIM)).hideSeek?.spot).toBeUndefined();
});
