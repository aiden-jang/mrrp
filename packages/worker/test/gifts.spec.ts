import { env, runInDurableObject } from "cloudflare:test";
import { expect, it } from "vitest";
import { harness, HER, HIM, STRANGER } from "./harness.js";

const h = harness("giftroom");
const stub = () => env.ROOM.get(env.ROOM.idFromName(h.id));

it.each(["pet", "brush", "sit", "photo"])("leaves her gift alone when he chooses %s", async (action) => {
  await h.seat();
  await h.post("gift", { me: HER, gift: "leaf" });
  await h.post("act", { me: HIM, action });
  expect((await h.view(HIM)).gift).toBe("leaf");
  expect((await h.view(HER)).keptGift).toBeNull();
});

it("keeps his chosen gift, tells both seats, and preserves her words", async () => {
  await h.seat();
  await h.post("gift", { me: HER, gift: "moth", text: "found him by the window" });
  const gift = await h.view(HIM);
  expect(gift.giftId).toBeTruthy();
  await h.view(HER);
  await h.tick();
  expect((await h.post("keepgift", { me: HIM, giftId: gift.giftId })).status).toBe(200);
  for (const me of [HIM, HER]) {
    const view = await h.view(me);
    expect(view.gift).toBeNull();
    expect(view.giftId).toBeNull();
    expect(view.keptGift?.gift).toBe("moth");
    expect(view.herLine?.text).toBe("found him by the window");
    expect(JSON.stringify(view.keptGift)).not.toContain(HER);
    if (me === HER) expect(view.arrivals.some((a) => a.kind === "kept" && a.gift === "moth")).toBe(true);
  }
  const stranger = await h.view(STRANGER);
  expect(stranger.giftId).toBeNull();
  expect(stranger.keptGift).toBeNull();
});

it("only lets the companion keep a gift", async () => {
  await h.seat();
  await h.post("gift", { me: HER, gift: "cap" });
  const giftId = (await h.view(HIM)).giftId;
  for (const me of [HER, STRANGER]) expect((await h.post("keepgift", { me, giftId })).status).toBe(409);
  expect((await h.view(HIM)).gift).toBe("cap");
});

it("does not take another leaf when an old button is clicked", async () => {
  await h.seat();
  await h.post("gift", { me: HER, gift: "leaf" });
  const old = (await h.view(HIM)).giftId;
  await h.post("gift", { me: HER, gift: "leaf" });
  const next = (await h.view(HIM)).giftId;
  expect(next).not.toBe(old);
  expect((await h.post("keepgift", { me: HIM, giftId: old })).status).toBe(409);
  expect((await h.view(HIM)).giftId).toBe(next);
  expect((await h.view(HER)).keptGift).toBeNull();
});

it("lets a lost response be retried without taking the next gift", async () => {
  await h.seat();
  await h.post("gift", { me: HER, gift: "leaf" });
  const giftId = (await h.view(HIM)).giftId;
  await h.post("keepgift", { me: HIM, giftId });
  const receipt = (await h.view(HER)).keptGift;
  await h.post("gift", { me: HER, gift: "cap" });
  expect((await h.post("keepgift", { me: HIM, giftId })).status).toBe(200);
  expect((await h.view(HIM)).gift).toBe("cap");
  expect((await h.view(HER)).keptGift).toEqual(receipt);
});

it("supports gifts already stored before explicit keeping existed", async () => {
  await h.seat();
  await runInDurableObject(stub(), async (_room, state) => state.storage.put("gift", "moth"));
  const giftId = (await h.view(HIM)).giftId;
  expect(giftId).toBeTruthy();
  expect((await h.post("keepgift", { me: HIM, giftId })).status).toBe(200);
  expect((await h.view(HIM)).gift).toBeNull();
});

it("gives a restored gift a fresh identity", async () => {
  await h.seat();
  await h.post("gift", { me: HER, gift: "leaf" });
  const old = (await h.view(HIM)).giftId;
  await h.post("leave", { me: HER });
  await h.post("unleave", { me: HER });
  const restored = await h.view(HIM);
  expect(restored.gift).toBe("leaf");
  expect(restored.giftId).not.toBe(old);
  expect((await h.post("keepgift", { me: HIM, giftId: old })).status).toBe(409);
});

it("preserves gift ownership when she refreshes her access", async () => {
  await h.seat();
  await h.post("gift", { me: HER, gift: "cap" });
  const giftId = (await h.view(HIM)).giftId;
  const next = "newcatbrowserkey";
  await h.post("rotate", { me: HER, next });
  await h.post("keepgift", { me: HIM, giftId });
  expect((await h.view(next)).keptGift?.gift).toBe("cap");
  await h.post("rotate", { me: next, next: "anothercatbrowserkey" });
  expect((await h.view("anothercatbrowserkey")).keptGift?.gift).toBe("cap");
});

it("does not credit the previous cat's gift to a new participant", async () => {
  await h.seat();
  await h.post("gift", { me: HER, gift: "leaf" });
  const giftId = (await h.view(HIM)).giftId;
  await h.post("release", { me: HIM });
  const next = "newparticipantkey";
  await h.view(next);
  await h.post("keepgift", { me: HIM, giftId });
  const view = await h.view(next);
  expect(view.keptGift).toBeNull();
  expect(view.arrivals.some((a) => a.kind === "kept")).toBe(false);
});

it.each([undefined, null, 7, "", "not-a-gift"])("rejects malformed identity %s", async (giftId) => {
  await h.seat();
  expect((await h.post("keepgift", { me: HIM, giftId })).status).toBe(400);
});
