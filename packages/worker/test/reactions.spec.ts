import { env, runInDurableObject } from "cloudflare:test";
import { expect, it } from "vitest";
import { harness, HER, HIM, STRANGER } from "./harness.js";

const h = harness("reactionroom");
const reactions = ["flop", "hide-face", "innocent"] as const;

it.each(reactions)("shares her %s without impersonating affection or writing history", async (kind) => {
  await h.seat();
  await h.post("tell", { me: HER, mood: "tired" });
  const before = await h.view(HIM);
  expect((await h.post("heract", { me: HER, act: kind })).status).toBe(200);
  const hers = await h.view(HER);
  const his = await h.view(HIM);
  expect(his.reaction?.kind).toBe(kind);
  expect(his.reaction?.at).toBe(hers.reaction?.at);
  expect(his.reaction?.remainingMs).toBeGreaterThan(0);
  expect(his.affection).toBeNull();
  expect(his.catMood).toBe("tired");
  expect(his.theirRecent).toEqual(before.theirRecent);
  expect((await h.view(STRANGER)).reaction).toBeNull();
  expect(JSON.stringify(his.reaction)).not.toContain(HER);
});

it.each(reactions)("only lets her choose %s", async (kind) => {
  await h.seat();
  for (const me of [HIM, STRANGER]) {
    await h.post("heract", { me, act: kind });
    expect((await h.view(HER)).reaction).toBeNull();
  }
});

it("does not interrupt contact or replace a reaction that is still playing", async () => {
  await h.seat();
  await h.post("hold", { me: HIM, on: true });
  await h.post("heract", { me: HER, act: "flop" });
  expect((await h.view(HER)).reaction).toBeNull();
  await h.post("hold", { me: HIM, on: false });
  await h.post("heract", { me: HER, act: "hide-face" });
  const first = (await h.view(HER)).reaction;
  await h.post("heract", { me: HER, act: "innocent" });
  await h.post("heract", { me: HER, act: "ask-pets" });
  expect((await h.view(HER)).reaction?.at).toBe(first?.at);
  expect((await h.view(HER)).reaction?.kind).toBe("hide-face");
});

it("replaces a pet request with a reaction and finishes without a queued action", async () => {
  await h.seat();
  await h.post("heract", { me: HER, act: "ask-pets" });
  await h.post("heract", { me: HER, act: "flop" });
  expect((await h.view(HIM)).affection).toBeNull();
  expect((await h.view(HIM)).reaction?.kind).toBe("flop");
  h.away(4 / 3600);
  const next = await h.view(HER);
  expect(next.reaction).toBeNull();
  expect(next.affection).toBeNull();
});

it("lets petting end the reaction and keeps the new hold usable", async () => {
  await h.seat();
  await h.post("heract", { me: HER, act: "innocent" });
  await h.post("hold", { me: HIM, on: true });
  expect((await h.view(HER)).reaction).toBeNull();
  await h.post("heract", { me: HER, act: "nuzzle" });
  expect((await h.view(HER)).affection?.kind).toBe("nuzzle");
});

it("does not restore a reaction after she leaves and returns", async () => {
  await h.seat();
  await h.post("heract", { me: HER, act: "flop" });
  await h.post("leave", { me: HER });
  await h.post("unleave", { me: HER });
  expect((await h.view(HER)).reaction).toBeNull();
  await runInDurableObject(env.ROOM.get(env.ROOM.idFromName(h.id)), async (_room, state) => {
    expect(await state.storage.get("affection")).toBeUndefined();
  });
});
