import { SELF, env, runInDurableObject } from "cloudflare:test";
import { expect, it } from "vitest";
import { harness, HIM, HER, STRANGER } from "./harness.js";

const h = harness("seataccess");
const NEXT = "nextbrowserkey123";
const LATER = "laterbrowserkey123";

it("keeps roles stable when older seats have the same arrival timestamp", async () => {
  await h.seat();
  await runInDurableObject(env.ROOM.get(env.ROOM.idFromName(h.id)), async (_room, state) => {
    const people = (await state.storage.get<Record<string, { firstSeen: number }>>("people"))!;
    for (const person of Object.values(people)) person.firstSeen = 1;
    await state.storage.put("people", people);
  });
  await h.post("rotate", { me: HIM, next: NEXT });
  expect((await h.view(NEXT)).youAreHer).toBe(false);
  expect((await h.view(HER)).youAreHer).toBe(true);
});

it("replaces only the caller's key, preserves both roles and content, and keeps code recovery", async () => {
  await h.seat();
  const code = (await h.view(HIM)).recoveryCode!;
  const herCode = (await h.view(HER)).recoveryCode!;
  await h.post("notes", { me: HIM, notes: ["A kept note"] });
  await h.post("say", { me: HER, text: "Still here" });
  await h.post("act", { me: HIM, action: "brush" });
  expect((await h.post("rotate", { me: HIM, next: NEXT })).status).toBe(200);
  const current = await h.view(NEXT);
  expect(current.seat).toBe(NEXT);
  expect(current.youAreHer).toBe(false);
  expect(current.recoveryCode).toBe(code);
  expect(current.herLine?.text).toBe("Still here");
  expect((await h.view(HER)).recoveryCode).toBe(herCode);
  expect((await h.view(HER)).theirRecent.map((v) => v.action)).toContain("brush");
  expect((await SELF.fetch(`https://mrrp.test/api/room/${h.id}/notes?me=${NEXT}`)).status).toBe(200);
  expect((await SELF.fetch(`https://mrrp.test/api/room/${h.id}/notes?me=${HIM}`)).status).toBe(403);
  expect((await h.view(HIM)).seat).toBeNull();
  expect((await h.post("recover", { me: LATER, code })).status).toBe(200);
  expect((await h.view(LATER)).youAreHer).toBe(false);
  expect((await h.view(NEXT)).seat).toBeNull();
});

it("never turns a revoked key into the empty second seat, even after the other person leaves", async () => {
  await h.view(HIM, "Owner");
  expect((await h.post("rotate", { me: HIM, next: NEXT })).status).toBe(200);
  expect((await h.view(HIM)).seat).toBeNull();
  expect((await h.view(STRANGER, "Guest")).youAreHer).toBe(true);
  await h.post("leave", { me: STRANGER });
  expect((await h.view(HIM)).seat).toBeNull();
  expect((await h.view(NEXT)).waitingForThem).toBe(true);
});

it("retries a completed replacement without rotating twice or accepting another destination", async () => {
  await h.seat();
  expect((await h.post("rotate", { me: HIM, next: NEXT })).status).toBe(200);
  expect((await h.post("rotate", { me: HIM, next: NEXT })).status).toBe(200);
  expect((await h.post("rotate", { me: HIM, next: LATER })).status).toBe(403);
  expect((await h.post("rotate", { me: STRANGER, next: LATER })).status).toBe(403);
  expect((await h.post("rotate", { me: NEXT, next: HER })).status).toBe(403);
  expect((await h.post("rotate", { me: NEXT, next: HIM })).status).toBe(403);
  expect((await h.view(NEXT)).youAreHer).toBe(false);
  expect((await h.view(HER)).youAreHer).toBe(true);
});

it("blocks old sockets immediately and preserves live connections for the other person", async () => {
  await h.seat();
  const connect = async (me: string) => {
    const response = await SELF.fetch(`https://mrrp.test/api/room/${h.id}/live?me=${me}`, {
      headers: { Upgrade: "websocket" },
    });
    expect(response.status).toBe(101);
    const socket = response.webSocket!;
    socket.accept();
    return socket;
  };
  const owner = await connect(HIM),
    guest = await connect(HER);
  let ownerClosed = 0,
    guestClosed = 0;
  owner.addEventListener("close", (event) => {
    ownerClosed = event.code;
  });
  guest.addEventListener("close", (event) => {
    guestClosed = event.code;
  });
  await h.post("rotate", { me: HIM, next: NEXT });
  await expect.poll(() => ownerClosed).toBe(1008);
  expect(guestClosed).toBe(0);
  expect(
    (
      await SELF.fetch(`https://mrrp.test/api/room/${h.id}/live?me=${HIM}`, {
        headers: { Upgrade: "websocket" },
      })
    ).status,
  ).toBe(403);
  guest.close();
});
