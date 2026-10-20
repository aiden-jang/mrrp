import { SELF } from "cloudflare:test";
import { expect, it } from "vitest";

it.each(["__proto__", "constructor", "toString", "__defineGetter__", "x".repeat(129)])(
  "rejects reserved or oversized seat tokens before room access: %s",
  async (me) => {
    for (const suffix of ["", "/notes", "/said", "/live"]) {
      const response = await SELF.fetch(
        `https://x/api/room/seatinput${suffix}?${new URLSearchParams({ me })}`,
      );
      expect(response.status, suffix || "room").toBe(400);
    }
    const response = await SELF.fetch("https://x/api/room/seatinput/act", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ me, action: "pet" }),
    });
    expect(response.status, "act").toBe(400);
  },
);

it.each([{}, ["validseattoken"], 12345678])("rejects nonstring seat tokens", async (me) => {
  const response = await SELF.fetch("https://x/api/room/seatinput/act", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ me, action: "pet" }),
  });
  expect(response.status).toBe(400);
});

it("rejects null JSON at every public room mutation boundary", async () => {
  for (const action of [
    "act",
    "heract",
    "poke",
    "wait",
    "unsay",
    "settle",
    "sit",
    "hold",
    "boxout",
    "leaveout",
    "gift",
    "tell",
    "say",
    "link",
    "draw",
    "ourday",
    "dress",
    "notes",
    "recover",
    "found",
    "shelf",
    "window-light",
    "release",
    "delete",
    "blanket",
    "unleave",
    "undelete",
    "leave",
    "clock",
  ]) {
    const response = await SELF.fetch(`https://x/api/room/seatinput/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "null",
    });
    expect(response.status, action).toBe(400);
  }
});
