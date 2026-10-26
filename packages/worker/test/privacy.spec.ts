import { SELF } from "cloudflare:test";
import { expect, it } from "vitest";
import { harness, HIM } from "./harness.js";
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
