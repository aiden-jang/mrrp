import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

// No AUTH_URL is reachable here, the same shape as a real outage: the answer is "signed out".

describe("/api/me", () => {
  it("says signed out when there is no cookie", async () => {
    const r = await SELF.fetch("https://mrrp.test/api/me");
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ signedIn: false, name: null });
  });

  it("says signed out rather than failing when auth cannot be reached", async () => {
    const r = await SELF.fetch("https://mrrp.test/api/me", {
      headers: { cookie: "platform_session=whatever-this-cannot-be-checked" },
    });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ signedIn: false, name: null });
  });

  it("never hands back anything but the two fields the row needs", async () => {
    // No email, no user id: the page only has to render "Signed in as X".
    const body = (await (await SELF.fetch("https://mrrp.test/api/me")).json()) as object;
    expect(Object.keys(body).sort()).toEqual(["name", "signedIn"]);
  });
});
