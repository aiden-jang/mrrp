import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { Mood } from "../src/types.js";
import { harness, HER, HIM, STRANGER } from "./harness.js";

const { id, post, seat, tick, view } = harness("seatsroom");

describe("seats", () => {
  it("makes the second arrival the one the cat is", async () => {
    await seat();
    expect((await view(HIM)).youAreHer).toBe(false);
    expect((await view(HER)).youAreHer).toBe(true);
  });

  it("waits for the second seat before showing anything", async () => {
    await view(HIM, "Aiden");
    const v = await view(HIM);
    expect(v.waitingForThem).toBe(true);
    expect(v.note).toBeNull();
    expect(v.catMood).toBeNull();
  });

  it("lets a third person look but not sit", async () => {
    await seat();
    const v = await view(STRANGER);
    expect(v.youAreHer).toBe(false);
    expect(v.you).toBeNull();
    expect(v.note).toBeNull();
  });
});

describe("who may do what", () => {
  it("lets her set the mood", async () => {
    await seat();
    await post("tell", { me: HER, mood: "sad" });
    expect((await view(HIM)).catMood).toBe("sad");
  });

  it("ignores him setting the mood, because the cat is not him", async () => {
    await seat();
    await post("tell", { me: HER, mood: "sad" });
    await post("tell", { me: HIM, mood: "good" });
    expect((await view(HER)).catMood).toBe("sad");
  });

  it("ignores a stranger setting the mood", async () => {
    await seat();
    await post("tell", { me: HER, mood: "tired" });
    await view(STRANGER);
    await post("tell", { me: STRANGER, mood: "bored" });
    expect((await view(HER)).catMood).toBe("tired");
  });

  it("rejects a mood that isn't one of the six", async () => {
    await seat();
    const r = await post("tell", { me: HER, mood: "furious" as Mood });
    expect(r.status).toBe(400);
  });

  it("lets him act, and she reads it in second person", async () => {
    await seat();
    await post("act", { me: HIM, action: "sit" });
    const hers = await view(HER);
    expect(hers.theirRecent.map((v) => v.action)).toEqual(["sit"]);
  });

  it("ignores her acting, because she is the cat", async () => {
    await seat();
    await post("act", { me: HER, action: "pet" });
    expect((await view(HER)).theirRecent).toEqual([]);
    expect((await view(HIM)).theirRecent).toEqual([]);
  });

  it("never echoes his own actions back to him", async () => {
    await seat();
    await post("act", { me: HIM, action: "pet" });
    await post("act", { me: HIM, action: "brush" });
    expect((await view(HIM)).theirRecent).toEqual([]);
  });

  it("only lets him dress the cat", async () => {
    await seat();
    expect((await post("dress", { me: HER, name: "Nope" })).status).toBe(403);
    await view(STRANGER);
    expect((await post("dress", { me: STRANGER, name: "Nope" })).status).toBe(403);
    expect((await post("dress", { me: HIM, name: "Miso" })).status).toBe(200);
    expect((await view(HER)).cat.name).toBe("Miso");
  });

  it("keeps the rest of her when he changes only her name", async () => {
    // The route sends all six fields every time and leaves undefined in the ones nobody set, and a
    // spread of undefined overwrites. Renaming her used to leave a cat with no fur to draw.
    await seat();
    const before = (await view(HIM)).cat;
    expect((await post("dress", { me: HIM, name: "Miso" })).status).toBe(200);

    const after = (await view(HIM)).cat;
    expect(after.name).toBe("Miso");
    expect(after.fur).toBe(before.fur);
    expect(after.belly).toBe(before.belly);
    expect(after.eyes).toBe(before.eyes);
    expect(after.tabby).toBe(before.tabby);
  });

  it("only lets him set whose day the room runs on", async () => {
    await seat();
    expect((await post("clock", { me: HER, tz: "Asia/Tokyo" })).status).toBe(403);
    expect((await post("clock", { me: HIM, tz: "Asia/Seoul", homeHour: 20 })).status).toBe(200);
    const v = await view(HER);
    expect(v.clock).toEqual({ tz: "Asia/Seoul", homeHour: 20 });
  });

  it("rejects a timezone the runtime doesn't know", async () => {
    await seat();
    expect((await post("clock", { me: HIM, tz: "Mars/Olympus" })).status).toBe(400);
    expect((await post("clock", { me: HIM, homeHour: 99 })).status).toBe(400);
    expect((await view(HER)).clock.tz).toBe("America/New_York");
  });
});

describe("requests that should not get through", () => {
  it("rejects short tokens and malformed room ids", async () => {
    expect((await SELF.fetch("https://x/api/room/abc?me=himhimhimhim")).status).toBe(400);
    expect((await SELF.fetch(`https://x/api/room/${id}?me=short`)).status).toBe(400);
  });

  it("rejects an action that isn't one of the four", async () => {
    await seat();
    expect((await post("act", { me: HIM, action: "feed" })).status).toBe(400);
  });
});

describe("presence", () => {
  it("reports him as here now, then as having been here", async () => {
    await seat();
    await post("act", { me: HIM, action: "pet" });
    expect((await view(HER)).themHereNow).toBe(true);
  });

  it("tells her he came in after she spoke, and not before", async () => {
    await seat();
    await post("act", { me: HIM, action: "sit" });
    await post("tell", { me: HER, mood: "sad" });
    expect((await view(HER)).theyCameAfter).toBe(false);
    await view(HIM);
    expect((await view(HER)).theyCameAfter).toBe(true);
  });

  it("hands her his between-visit gestures once, as an arrival card", async () => {
    await seat();
    await view(HER);
    await tick(2);
    await post("act", { me: HIM, action: "brush" });
    await post("act", { me: HIM, action: "sit" });

    const returned = await view(HER);
    expect(returned.arrivals.map((item) => (item.kind === "action" ? item.action : item.kind))).toEqual([
      "sit",
      "brush",
    ]);
    expect((await view(HER)).arrivals).toEqual([]);
  });

  it("hands him her new mood and line without requiring them to overlap", async () => {
    await seat();
    await view(HIM);
    await tick(2);
    await post("tell", { me: HER, mood: "tired" });
    await post("say", { me: HER, text: "sleep soon please" });

    const returned = await view(HIM);
    expect(returned.arrivals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "mood", mood: "tired" }),
        expect.objectContaining({ kind: "line", text: "sleep soon please" }),
      ]),
    );
    expect((await view(HIM)).arrivals).toEqual([]);
  });
});

describe("both of you at once", () => {
  it("is false when only one of you has been in", async () => {
    await view(HIM, "Aiden");
    expect((await view(HIM)).bothHereNow).toBe(false);
  });

  it("is true for each of you when you are both recently here", async () => {
    await seat();
    expect((await view(HER)).bothHereNow).toBe(true);
    expect((await view(HIM)).bothHereNow).toBe(true);
  });

  it("is never true for a spectator, who is nobody's company", async () => {
    await seat();
    expect((await view(STRANGER)).bothHereNow).toBe(false);
  });
});

describe("both of you calling her by name", () => {
  it("is false until each of them has", async () => {
    await seat();
    expect((await view(HIM)).bothCalledHer).toBe(false);

    await post("found", { me: HIM, key: "herName" });
    expect((await view(HIM)).bothCalledHer).toBe(false);

    await post("found", { me: HER, key: "herName" });
    expect((await view(HIM)).bothCalledHer).toBe(true);
    expect((await view(HER)).bothCalledHer).toBe(true);
  });

  it("is not reachable by one person doing it twice", async () => {
    await seat();
    await post("found", { me: HIM, key: "herName" });
    await post("found", { me: HIM, key: "herName" });
    expect((await view(HIM)).bothCalledHer).toBe(false);
  });

  it("tells a spectator nothing", async () => {
    await seat();
    await post("found", { me: HIM, key: "herName" });
    await post("found", { me: HER, key: "herName" });
    expect((await view(STRANGER)).bothCalledHer).toBe(false);
  });
});
