import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

/*
 * The sign-in row reads this. It must answer rather than fail: the tests run with no AUTH_URL
 * reachable, which is the same shape as a real auth outage, and mrrp is designed to work signed out.
 */

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
