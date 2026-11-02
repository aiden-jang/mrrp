import { SELF } from "cloudflare:test";
import { expect, it } from "vitest";
import { harness, HIM, HER } from "./harness.js";
const h = harness("privateheaders");

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
