import { env, runInDurableObject, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { harness, HER, HIM, STRANGER } from "./harness.js";

const { id, post, seat, view } = harness("sittingroom");

describe("sitting with her", () => {
  it("is a place he stays, and she sees it while he is there", async () => {
    await seat();
    await post("sit", { me: HIM, on: true });

    expect((await view(HIM)).sittingWith).toBe(true);
    expect((await view(HER)).sittingWithYou).toBe(true);
    expect((await view(HER)).sittingWith).toBe(false);
    // He is the one sitting, so nobody is sitting with him.
    expect((await view(HIM)).sittingWithYou).toBe(false);
  });

  it("ends when he gets up", async () => {
    await seat();
    await post("sit", { me: HIM, on: true });
    await post("sit", { me: HIM, on: false });

    expect((await view(HIM)).sittingWith).toBe(false);
    expect((await view(HER)).sittingWithYou).toBe(false);
  });

  it("still marks the day, so what he did survives him getting up", async () => {
    await seat();
    await post("sit", { me: HIM, on: true });
    await post("sit", { me: HIM, on: false });

    expect((await view(HIM)).satWith).toBe(true);
  });

  it("is his to do, not hers and not a stranger's", async () => {
    await seat();
    await view(STRANGER);
    await post("sit", { me: HER, on: true });
    await post("sit", { me: STRANGER, on: true });

    expect((await view(HER)).sittingWith).toBe(false);
    expect((await view(HIM)).sittingWith).toBe(false);
  });

  it("does not show to somebody who only has the link", async () => {
    await seat();
    await post("sit", { me: HIM, on: true });
    const v = await view(STRANGER);
    expect(v.sittingWith).toBe(false);
    expect(v.sittingWithYou).toBe(false);
  });

  it("lapses rather than leaving her sat with forever", async () => {
    await seat();
    await post("sit", { me: HIM, on: true });

    const stub = env.ROOM.get(env.ROOM.idFromName(id));
    await runInDurableObject(stub, async (_i, state) => {
      const sat = await state.storage.get<{ who: string; at: number }>("sitting");
      await state.storage.put("sitting", { ...sat!, at: Date.now() - 11 * 60_000 });
    });

    expect((await view(HER)).sittingWithYou).toBe(false);
  });

  it("refuses anything but a yes or no", async () => {
    await seat();
    const r = await SELF.fetch(`https://x/api/room/${id}/sit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ me: HIM, on: "yes please" }),
    });
    expect(r.status).toBe(400);
  });
});
