import { env, runDurableObjectAlarm, runInDurableObject, SELF } from "cloudflare:test";
import { expect, it, vi } from "vitest";
import { harness, HIM, HER, STRANGER } from "./harness.js";
const h = harness("privateheaders");
const room = () => env.ROOM.get(env.ROOM.idFromName(h.id));
const privateDay = { month: 3, day: 8, label: "A private date" };

async function exportRoom(me: string) {
  const response = await SELF.fetch(`https://mrrp.test/api/room/${h.id}/export?me=${me}`);
  expect(response.status).toBe(200);
  return response.json();
}

function nextSpringForward() {
  const date = new Date(Date.UTC(new Date().getUTCFullYear() + 1, 2, 8, 5));
  date.setUTCDate(date.getUTCDate() + ((7 - date.getUTCDay()) % 7));
  return date.getTime();
}

it("room and account responses forbid browser caching", async () => {
  for (const path of [
    "/api/me",
    `/api/room/${h.id}?me=${HIM}`,
    `/api/room/${h.id}/notes?me=${HIM}`,
    `/api/room/${h.id}/export?me=${HIM}`,
  ]) {
    const response = await SELF.fetch(`https://mrrp.test${path}`);
    expect(response.headers.get("cache-control"), path).toBe("no-store");
    expect(response.headers.get("referrer-policy"), path).toBe("no-referrer");
  }
});

it("exports activity without disclosing either participant's seat credential", async () => {
  await h.seat();
  await h.post("act", { me: HIM, action: "brush" });
  expect((await h.post("heract", { me: HER, act: "shelf" })).status).toBe(200);
  for (const me of [HIM, HER]) {
    const response = await SELF.fetch(`https://mrrp.test/api/room/${h.id}/export?me=${me}`);
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).not.toContain(HIM);
    expect(text).not.toContain(HER);
    const data = JSON.parse(text) as { lately: { who: string; action: string; at: number }[] };
    expect(data.lately.map((entry) => entry.who)).toEqual([
      me === HER ? "you" : "them",
      me === HIM ? "you" : "them",
    ]);
    expect(data.lately.map((entry) => entry.action)).toEqual(["shelf", "brush"]);
    expect(data.lately.every((entry) => Number.isFinite(entry.at))).toBe(true);
  }
});

it("room views disclose only the caller's own seat credential", async () => {
  await h.seat();
  await h.post("act", { me: HIM, action: "brush" });
  await h.post("heract", { me: HER, act: "shelf" });
  for (const me of [HIM, HER]) {
    const view = await h.view(me);
    expect(view.seat).toBe(me);
    expect(JSON.stringify(view)).not.toContain(me === HIM ? HER : HIM);
    expect(view.theirRecent).toEqual([{ at: expect.any(Number), action: me === HIM ? "shelf" : "brush" }]);
  }
});

it("restores a private date only when its owner undoes leaving", async () => {
  await h.seat();
  await h.post("ourday", { me: HER, ...privateDay });
  expect((await h.view(HER)).ourDay).toEqual(privateDay);
  expect((await h.post("leave", { me: HER })).status).toBe(200);
  expect((await h.post("unleave", { me: HER })).status).toBe(200);
  expect(await exportRoom(HER)).toMatchObject({ ourDay: privateDay });
  expect((await h.post("leave", { me: HER })).status).toBe(200);
  expect((await h.view(STRANGER)).ourDay).toBeNull();
  expect(await exportRoom(STRANGER)).toMatchObject({ ourDay: null });
  expect((await h.post("unleave", { me: HER })).status).toBe(403);
  expect((await h.post("release", { me: HIM })).status).toBe(200);
  expect((await h.post("unleave", { me: HER })).status).toBe(403);
});

it("carries a private date through key rotation but never through an unverified seat handoff", async () => {
  await h.seat();
  await h.post("ourday", { me: HER, ...privateDay });
  const next = "newbrowserkey1234";
  expect((await h.post("rotate", { me: HER, next })).status).toBe(200);
  expect((await h.view(next)).ourDay).toEqual(privateDay);
  expect((await h.post("release", { me: HIM })).status).toBe(200);
  expect((await h.view(STRANGER)).ourDay).toBeNull();
  expect(await exportRoom(STRANGER)).toMatchObject({ ourDay: null });
});

it("never exposes a legacy date with no verifiable owner, even as a milestone", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date("2026-03-08T15:00:00Z"));
  await h.seat();
  await runInDurableObject(room(), async (_instance, state) => state.storage.put("herDay", privateDay));
  expect((await h.view(HIM)).milestone?.label).not.toBe(privateDay.label);
  expect((await h.view(HER)).ourDay).toBeNull();
  expect(await exportRoom(HER)).toMatchObject({ ourDay: null });
  await runInDurableObject(room(), async (_instance, state) => {
    expect(await state.storage.get("herDay")).toBeUndefined();
  });
});

it("erases the active mood at room midnight even when nobody opens the room", async () => {
  const springForward = nextSpringForward();
  const nextMidnight = springForward + 23 * 60 * 60_000;
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(springForward);
  await h.seat("America/New_York");
  expect((await h.post("tell", { me: HER, mood: "sad" })).status).toBe(200);
  expect(await exportRoom(HIM)).toMatchObject({ moodNow: { mood: "sad" } });
  await runInDurableObject(room(), async (_instance, state) => {
    expect(await state.storage.getAlarm()).toBe(nextMidnight);
  });
  vi.setSystemTime(nextMidnight + 1_000);
  expect(await runDurableObjectAlarm(room())).toBe(true);
  await runInDurableObject(room(), async (_instance, state) => {
    expect(await state.storage.get("moods")).toBeUndefined();
  });
  expect(await exportRoom(HIM)).toMatchObject({ moodNow: null });
  expect((await h.view(HIM)).arrivals.map(({ kind }) => kind)).not.toContain("mood");
});

it("drops yesterday's mood from the leave backup and preserves the rest for Undo", async () => {
  const afternoon = nextSpringForward() + 10 * 60 * 60_000;
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(afternoon);
  await h.seat();
  await h.post("ourday", { me: HER, ...privateDay });
  await h.post("tell", { me: HER, mood: "sad" });
  expect((await h.post("leave", { me: HER })).status).toBe(200);
  h.away(25);
  expect(await runDurableObjectAlarm(room())).toBe(true);
  await runInDurableObject(room(), async (_instance, state) => {
    expect(await state.storage.get("leftSide")).not.toHaveProperty("mood");
  });
  expect((await h.post("unleave", { me: HER })).status).toBe(200);
  expect(await exportRoom(HER)).toMatchObject({ ourDay: privateDay, moodNow: null });
});

it("clears an expired pre-update mood on the first export", async () => {
  await h.seat();
  await runInDurableObject(room(), async (_instance, state) => {
    await state.storage.put("moods", { [HER]: { mood: "sad", at: Date.now() - 48 * 60 * 60_000 } });
  });
  expect(await exportRoom(HIM)).toMatchObject({ moodNow: null });
  await runInDurableObject(room(), async (_instance, state) => {
    expect(await state.storage.get("moods")).toBeUndefined();
  });
});

it("clears a legacy mood from an existing leave backup on the next room visit", async () => {
  await h.seat();
  expect((await h.post("leave", { me: HER })).status).toBe(200);
  await runInDurableObject(room(), async (_instance, state) => {
    const kept = await state.storage.get<Record<string, unknown>>("leftSide");
    await state.storage.put("leftSide", {
      ...kept,
      mood: { mood: "sad", at: Date.now() - 48 * 60 * 60_000 },
    });
  });
  expect((await h.view(HIM)).waitingForThem).toBe(true);
  await runInDurableObject(room(), async (_instance, state) => {
    expect(await state.storage.get("leftSide")).not.toHaveProperty("mood");
  });
  expect((await h.post("unleave", { me: HER })).status).toBe(200);
});
