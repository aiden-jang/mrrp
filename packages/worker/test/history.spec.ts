import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { harness, HER, HIM, STRANGER } from "./harness.js";

const { away, post, seat, view } = harness("historyroom");

describe("what the room works out from having been used a while", () => {
  const acted = async (action: string, times: number): Promise<void> => {
    for (let i = 0; i < times; i += 1) expect((await post("act", { me: HIM, action })).status).toBe(200);
  };

  const settled = async (): Promise<void> => {
    await seat();
    away(24 * 30);
  };

  it("says nothing about a room that has just started", async () => {
    await seat();
    const v = await view(HIM);
    expect(v.milestone).toBeNull();
    expect(v.personality).toBeNull();
  });

  it("gives a brand-new room no personality, however much he taps in it", async () => {
    await seat();
    await acted("pet", 20);
    expect((await view(HIM)).personality).toBeNull();
  });

  it("marks the first week, on the day and not before", async () => {
    await seat();
    away(24 * 6 + 1);
    expect((await view(HIM)).milestone).toBeNull();
    away(24);
    expect((await view(HIM)).milestone).toEqual({ kind: "first-week", years: 0 });
  });

  it("tells both of them, because it is the room's age and not one person's", async () => {
    await seat();
    away(24 * 7);
    expect((await view(HIM)).milestone?.kind).toBe("first-week");
    expect((await view(HER)).milestone?.kind).toBe("first-week");
  });

  it("keeps the room's age when a seat changes hands", async () => {
    await seat();
    const code = (await view(HIM)).recoveryCode;
    expect(code).toBeTruthy();
    away(24 * 7);
    expect((await post("recover", { me: "brandnewdevice1", code })).status).toBe(200);
    expect((await view("brandnewdevice1")).milestone?.kind).toBe("first-week");
  });

  it("has no personality until there is enough history", async () => {
    await settled();
    await acted("pet", 11);
    expect((await view(HIM)).personality).toBeNull();
    await acted("pet", 1);
    expect((await view(HIM)).personality).toEqual({ trait: "petted", count: 12 });
  });

  it("keeps counting past the length of the visit log", async () => {
    await settled();
    await acted("brush", 45);
    expect((await view(HIM)).personality).toEqual({ trait: "brushed", count: 45 });
  });

  it("says nothing when he does a bit of everything", async () => {
    await settled();
    await acted("pet", 5);
    await acted("brush", 4);
    await acted("sit", 4);
    await acted("bring", 4);
    expect((await view(HIM)).personality).toBeNull();
  });

  it("shows a spectator neither, since a stranger is not part of the year", async () => {
    await seat();
    away(24 * 7);
    await acted("pet", 12);
    const v = await view(STRANGER);
    expect(v.personality).toBeNull();
    expect(v.milestone).toBeNull();
  });

  it("is not something she can move by reading the room", async () => {
    await settled();
    await acted("sit", 12);
    for (let i = 0; i < 5; i += 1) await view(HER);
    expect((await view(HIM)).personality).toEqual({ trait: "accompanied", count: 12 });
  });
});

describe("fast-forwarding a room", () => {
  it("moves the room's age, which is otherwise a year of waiting", async () => {
    await seat();
    expect((await view(HIM)).monthsOld).toBe(0);

    await post("age", { me: HIM, days: 400 });
    const aged = await view(HIM);
    expect(aged.monthsOld).toBe(13);
  });

  it("reaches every milestone the room has", async () => {
    await seat();
    for (const [days, kind] of [
      [7, "first-week"],
      [30, "first-month"],
      [365, "anniversary"],
    ] as const) {
      await post("age", { me: HIM, days });
      expect((await view(HIM)).milestone?.kind).toBe(kind);
    }
  });

  it("gives her a personality that would otherwise need weeks of history", async () => {
    await seat();
    expect((await view(HIM)).personality).toBeNull();

    await post("age", { me: HIM, days: 90, tally: { pet: 40, brush: 2 } });
    expect((await view(HIM)).personality?.trait).toBe("petted");
  });

  it("takes only the counts it knows, so an invented action cannot become a trait", async () => {
    await seat();
    await post("age", { me: HIM, days: 90, tally: { pet: 40, __proto__: 900, dance: 900 } });
    const p = await view(HIM);
    expect(p.personality?.trait).toBe("petted");
  });

  it("moves your own last visit, which is what coming back is measured from", async () => {
    await seat();
    await post("age", { me: HIM, awayHours: 100 * 24 });
    const back = await view(HIM);
    expect(Math.round((back.awayMs ?? 0) / (24 * 60 * 60 * 1000))).toBe(100);
    expect((await view(HIM)).awayMs).toBeLessThan(1000);
  });

  it("is not there at all without the dev flag", async () => {
    await seat();
    const on = env.DEV_TOOLS;
    env.DEV_TOOLS = undefined;
    try {
      const r = await post("age", { me: HIM, days: 400 });
      expect(r.status).toBe(404);
      expect((await view(HIM)).monthsOld).toBe(0);
    } finally {
      env.DEV_TOOLS = on;
    }
  });

  it("refuses somebody who only holds the link", async () => {
    await seat();
    await post("age", { me: STRANGER, days: 400 });
    expect((await view(HIM)).monthsOld).toBe(0);
  });
});
