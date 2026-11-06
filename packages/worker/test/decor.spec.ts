import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { harness, HER, HIM, STRANGER } from "./harness.js";
import type { RoomDecor } from "../src/types.js";

const { id, post, seat, view } = harness("decorroom");
const decor: RoomDecor = { palette: "moss", rug: "stripe", art: "moon", mug: "rose" };

describe("shared room decor", () => {
  it("validates the entire setup before applying any of it", async () => {
    await seat();
    const before = await view(HIM);
    const setup = {
      me: HIM,
      cat: { ...before.cat, name: "Miso" },
      clock: { tz: "UTC", homeHour: 20 },
      decor,
      notes: ["  Leave the window open.  "],
    };
    expect((await post("setup", { ...setup, clock: { ...setup.clock, homeHour: 24 } })).status).toBe(400);
    expect((await post("setup", { ...setup, me: HER })).status).toBe(403);
    expect(await view(HIM)).toMatchObject({ cat: before.cat, clock: before.clock });
    expect((await view(HIM)).decor).toBeUndefined();

    expect((await post("setup", setup)).status).toBe(200);
    expect(await view(HER)).toMatchObject({ cat: setup.cat, clock: setup.clock, decor });
    const notes = await SELF.fetch(`https://x/api/room/${id}/notes?me=${HIM}`);
    expect(await notes.json()).toEqual({ notes: ["Leave the window open."] });
  });

  it("saves the creator's choices for both seats and the export", async () => {
    await seat();
    expect((await view(HIM)).decor).toBeUndefined();
    expect((await post("dress", { me: HIM, decor })).status).toBe(200);
    expect((await view(HIM)).decor).toEqual(decor);
    expect((await view(HER)).decor).toEqual(decor);
    const copy = (await (await SELF.fetch(`https://x/api/room/${id}/export?me=${HIM}`)).json()) as {
      decor: RoomDecor;
    };
    expect(copy.decor).toEqual(decor);
    await post("dress", { me: HIM, name: "Miso" });
    expect((await view(HER)).decor).toEqual(decor);
  });

  it("does not let the cat or a spectator redecorate", async () => {
    await seat();
    for (const me of [HER, STRANGER]) expect((await post("dress", { me, decor })).status).toBe(403);
    expect((await view(HIM)).decor).toBeUndefined();
  });

  it("rejects invalid or incomplete choices without changing the room", async () => {
    await seat();
    await post("dress", { me: HIM, decor });
    for (const bad of [
      null,
      {},
      { ...decor, art: "script" },
      { ...decor, palette: ["rose"] },
      { ...decor, mug: 1 },
    ]) {
      expect((await post("dress", { me: HIM, decor: bad })).status).toBe(400);
      expect((await view(HIM)).decor).toEqual(decor);
    }
  });
});
