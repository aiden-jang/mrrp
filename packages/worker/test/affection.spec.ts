import { env, runInDurableObject, SELF } from "cloudflare:test";
import { expect, it, vi } from "vitest";
import { harness, HER, HIM, STRANGER } from "./harness.js";

const h = harness("affectionroom");

it("lets her ask and cancel without adding history or changing her mood", async () => {
  await h.seat();
  const before = await h.view(HIM);
  expect((await h.post("heract", { me: HER, act: "ask-pets" })).status).toBe(200);
  const hers = await h.view(HER);
  const his = await h.view(HIM);
  expect(hers.affection?.kind).toBe("ask");
  expect(his.affection?.at).toBe(hers.affection?.at);
  expect(his.affection?.remainingMs).toBeGreaterThan(0);
  expect(his.theirRecent).toEqual(before.theirRecent);
  expect(hers.catMood).toBeNull();
  await h.post("heract", { me: HER, act: "cancel-pets" });
  expect((await h.view(HIM)).affection).toBeNull();
});

it("ignores commands from the companion or a stranger and hides their state", async () => {
  await h.seat();
  for (const me of [HIM, STRANGER]) {
    await h.post("heract", { me, act: "ask-pets" });
    expect((await h.view(HER)).affection).toBeNull();
  }
  await h.post("heract", { me: HER, act: "ask-pets" });
  await h.post("heract", { me: STRANGER, act: "cancel-pets" });
  await h.post("heract", { me: HIM, act: "cancel-pets" });
  expect((await h.view(HER)).affection?.kind).toBe("ask");
  expect((await h.view(STRANGER)).affection).toBeNull();
});

it("expires requests without replaying them on later reads", async () => {
  await h.seat();
  await h.post("heract", { me: HER, act: "ask-pets" });
  h.away(21 / 3600);
  expect((await h.view(HIM)).affection).toBeNull();
  expect((await h.view(HER)).affection).toBeNull();
});

it("answers a request with petting and only nuzzles within that hold", async () => {
  await h.seat();
  await h.post("heract", { me: HER, act: "nuzzle" });
  expect((await h.view(HER)).affection).toBeNull();
  await h.post("heract", { me: HER, act: "ask-pets" });
  const start = await h.post("hold", { me: HIM, on: true });
  expect((await start.json<{ affection: unknown }>()).affection).toBeNull();
  await h.post("heract", { me: HER, act: "nuzzle" });
  expect((await h.view(HIM)).affection?.kind).toBe("nuzzle");
  expect((await h.view(HER)).affection?.kind).toBe("nuzzle");
  await h.post("hold", { me: HIM, on: false });
  await h.post("hold", { me: HIM, on: true });
  expect((await h.view(HER)).affection).toBeNull();
});

it("also answers a request through the ordinary pet action", async () => {
  await h.seat();
  await h.post("heract", { me: HER, act: "ask-pets" });
  await h.post("act", { me: HIM, action: "pet" });
  expect((await h.view(HER)).affection).toBeNull();
});

it("does not nuzzle a stale hold or retain a finished nuzzle", async () => {
  await h.seat();
  await h.post("hold", { me: HIM, on: true });
  await h.post("heract", { me: HER, act: "nuzzle" });
  h.away(2 / 3600);
  expect((await h.view(HER)).affection).toBeNull();
  h.away(31 / 3600);
  await h.post("heract", { me: HER, act: "nuzzle" });
  expect((await h.view(HER)).affection).toBeNull();
});

it("keeps a continuous hold alive and preserves a nuzzle through renewal", async () => {
  await h.seat();
  await h.post("hold", { me: HIM, on: true });
  for (let i = 0; i < 3; i++) {
    h.away(20 / 3600);
    await h.post("hold", { me: HIM, on: true });
  }
  await h.post("heract", { me: HER, act: "nuzzle" });
  const nuzzle = (await h.view(HER)).affection;
  expect(nuzzle?.kind).toBe("nuzzle");
  h.away(0.1 / 3600);
  await h.post("hold", { me: HIM, on: true });
  expect((await h.view(HER)).affection?.at).toBe(nuzzle?.at);
  await h.post("hold", { me: HIM, on: false });
  expect((await h.view(HER)).affection).toBeNull();
});

it("does not restore a request when she leaves and undoes leaving", async () => {
  await h.seat();
  await h.post("heract", { me: HER, act: "ask-pets" });
  await h.post("leave", { me: HER });
  await h.post("unleave", { me: HER });
  expect((await h.view(HER)).affection).toBeNull();
});

it("persists a live request without exposing seat credentials", async () => {
  await h.seat();
  await h.post("heract", { me: HER, act: "ask-pets" });
  await runInDurableObject(env.ROOM.get(env.ROOM.idFromName(h.id)), async (_room, state) => {
    expect(await state.storage.get("affection")).toMatchObject({ kind: "ask", by: HER });
  });
  const affection = (await h.view(HIM)).affection;
  expect(affection?.kind).toBe("ask");
  expect(JSON.stringify(affection)).not.toContain(HER);
  expect(JSON.stringify(affection)).not.toContain(HIM);
});

it("only asks while the companion is around", async () => {
  await h.seat();
  h.away(1);
  await h.post("heract", { me: HER, act: "ask-pets" });
  expect((await h.view(HER)).affection).toBeNull();
});

it("clears the request when her live connection closes", async () => {
  await h.seat();
  const response = await SELF.fetch(`https://x/api/room/${h.id}/live?me=${HER}`, {
    headers: { Upgrade: "websocket" },
  });
  const socket = response.webSocket!;
  socket.accept();
  await h.post("heract", { me: HER, act: "ask-pets" });
  expect((await h.view(HIM)).affection?.kind).toBe("ask");
  socket.close();
  await vi.waitFor(async () => expect((await h.view(HIM)).affection).toBeNull());
});
