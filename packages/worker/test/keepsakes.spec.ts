import { SELF, env, runInDurableObject, runDurableObjectAlarm } from "cloudflare:test";
import { expect, it } from "vitest";
import { harness, HER, HIM, STRANGER } from "./harness.js";
import type { KeepsakePage } from "../src/types.js";
const h = harness("keepsakeroom");
const stub = () => env.ROOM.get(env.ROOM.idFromName(h.id));
const read = async (me = HIM, before?: string) => {
  const query = new URLSearchParams({ me });
  if (before) query.set("before", before);
  return SELF.fetch(`https://x/api/room/${h.id}/keepsakes?${query}`);
};
const page = async (me = HIM, before?: string) => (await (await read(me, before)).json()) as KeepsakePage;
async function keep(text = "just for you") {
  await h.post("gift", { me: HER, gift: "leaf", text });
  const giftId = (await h.view(HIM)).giftId;
  await h.post("keepgift", { me: HIM, giftId });
  return giftId;
}

it("keeps distinct gifts, their original words and dates for both seats without leaking credentials", async () => {
  await h.seat();
  const first = await keep("first leaf");
  await h.tick();
  const second = await keep("second leaf");
  await h.post("say", { me: HER, text: "" });
  for (const me of [HER, HIM]) {
    const saved = await page(me);
    expect(saved.items.map((item) => item.id)).toEqual([second, first]);
    expect(saved.items.map((item) => item.text)).toEqual(["second leaf", "first leaf"]);
    expect(saved.items.every((item) => item.at > 0)).toBe(true);
    expect(JSON.stringify(saved)).not.toContain(HER);
    expect(JSON.stringify(saved)).not.toContain(HIM);
  }
  expect((await read(STRANGER)).status).toBe(403);
});

it("does not archive an unkept gift or duplicate a retried keep", async () => {
  await h.seat();
  await h.post("gift", { me: HER, gift: "moth", text: "not kept" });
  expect((await page()).items).toEqual([]);
  const giftId = await keep();
  await h.post("keepgift", { me: HIM, giftId });
  await h.post("keepgift", { me: HER, giftId });
  expect((await page()).items).toHaveLength(1);
});

it("includes the kept words in an export without exposing archive ownership keys", async () => {
  await h.seat();
  await keep("a keepsake for you");
  await runInDurableObject(stub(), async (room) => {
    const exported = await room.exportFor(HIM);
    expect(exported?.keepsakes).toMatchObject([{ gift: "leaf", text: "a keepsake for you" }]);
    expect(JSON.stringify(exported)).not.toContain(HER);
    expect(JSON.stringify(exported)).not.toContain(HIM);
  });
});

it("pages older gifts without repeating or dropping them", async () => {
  await h.seat();
  for (let i = 0; i < 23; i++) {
    await keep(`leaf ${i}`);
    await h.tick(1);
  }
  const first = await page();
  expect(first.items).toHaveLength(20);
  expect(first.next).toBeTruthy();
  expect(first.next).not.toContain(HER);
  const next = await page(HIM, first.next!);
  expect(next.items).toHaveLength(3);
  expect(next.next).toBeNull();
  expect(new Set([...first.items, ...next.items].map((item) => item.id)).size).toBe(23);
});

it("carries forward only an older explicit receipt without inventing its message", async () => {
  await h.seat();
  await runInDurableObject(stub(), async (_room, state) =>
    state.storage.put("giftKept", { id: "legacy:leaf", gift: "leaf", from: HER, at: 100 }),
  );
  expect((await page()).items).toEqual([{ id: "legacy:leaf", gift: "leaf", at: 100 }]);
  await runInDurableObject(stub(), async (_room, state) => {
    await state.storage.deleteAll();
  });
  await h.seat();
  await runInDurableObject(stub(), async (_room, state) =>
    state.storage.put("giftKept", { gift: "leaf", at: 100 }),
  );
  expect((await page()).items).toEqual([]);
});

it("preserves archive ownership across key replacement and hides it while her side is out", async () => {
  await h.seat();
  await keep();
  const next = "newcatbrowserkey";
  await h.post("rotate", { me: HER, next });
  expect((await page(next)).items).toHaveLength(1);
  await h.post("leave", { me: next });
  expect((await page(HIM)).items).toEqual([]);
  await h.post("unleave", { me: next });
  expect((await page(next)).items).toHaveLength(1);
});

it("restores the pending gift's message and removes departed archives after their undo window", async () => {
  await h.seat();
  await keep("kept before leaving");
  await h.post("gift", { me: HER, gift: "cap", text: "keep this cap" });
  await h.post("leave", { me: HER });
  await h.post("unleave", { me: HER });
  await h.post("keepgift", { me: HIM, giftId: (await h.view(HIM)).giftId });
  expect((await page()).items.some((item) => item.text === "keep this cap")).toBe(true);
  await h.post("leave", { me: HER });
  h.away(8 * 24);
  await runDurableObjectAlarm(stub());
  await runInDurableObject(stub(), async (_room, state) =>
    expect((await state.storage.list({ prefix: "keepsake:" })).size).toBe(0),
  );
});

it("erases departed archives when a new cat takes the seat", async () => {
  await h.seat();
  await keep();
  await h.post("leave", { me: HER });
  await h.view("newparticipantkey");
  expect((await page()).items).toEqual([]);
  await runInDurableObject(stub(), async (_room, state) =>
    expect((await state.storage.list({ prefix: `keepsake:${HER}:` })).size).toBe(0),
  );
});

it("moves and removes archives that span storage batches", async () => {
  await h.seat();
  await runInDurableObject(stub(), async (_room, state) => {
    const entries = Object.fromEntries(
      Array.from({ length: 125 }, (_, i) => {
        const item = { id: crypto.randomUUID(), gift: "leaf", text: `leaf ${i}`, at: 1000 + i };
        return [`keepsake:${HER}:${String(item.at).padStart(16, "0")}:${item.id}`, item];
      }),
    );
    await state.storage.put(entries);
  });
  const next = "newcatbrowserkey";
  await h.post("rotate", { me: HER, next });
  await runInDurableObject(stub(), async (_room, state) => {
    expect((await state.storage.list({ prefix: `keepsake:${HER}:` })).size).toBe(0);
    expect((await state.storage.list({ prefix: `keepsake:${next}:` })).size).toBe(125);
  });
  await h.post("leave", { me: next });
  await h.view("newparticipantkey");
  await runInDurableObject(stub(), async (_room, state) => {
    expect((await state.storage.list({ prefix: "keepsake:" })).size).toBe(0);
  });
});

it.each(["../", "0000000000000001:../../x", "bad", "x".repeat(200)])("rejects cursor %s", async (before) => {
  await h.seat();
  expect((await read(HIM, before)).status).toBe(400);
});
