import { runInDurableObject, env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { RoomView } from "../src/types.js";
import { harness, HER, HIM, STRANGER } from "./harness.js";

const { away, id, post, seat, tick, view } = harness("thingsroom");

describe("the photo on the wall", () => {
  it("starts as the fish it ships with", async () => {
    await seat();
    expect((await view(HER)).framed).toBe(false);
  });

  it("becomes her once he takes one, for both of them", async () => {
    await seat();
    await post("act", { me: HIM, action: "photo" });
    expect((await view(HIM)).framed).toBe(true);
    expect((await view(HER)).framed).toBe(true);
  });

  it("stays, because a photo is not a mood", async () => {
    await seat();
    await post("act", { me: HIM, action: "photo" });
    await post("act", { me: HIM, action: "pet" });
    await post("tell", { me: HER, mood: "feral" });
    expect((await view(HER)).framed).toBe(true);
  });

  it("is not hers to take, and not a stranger's", async () => {
    await seat();
    await post("act", { me: HER, action: "photo" });
    await view(STRANGER);
    await post("act", { me: STRANGER, action: "photo" });
    expect((await view(HER)).framed).toBe(false);
  });
});

describe("her line back", () => {
  it("lets her leave one, and he reads it", async () => {
    await seat();
    await post("say", { me: HER, text: "  I liked the third one  " });
    const his = await view(HIM);
    expect(his.herLine?.text).toBe("I liked the third one");
    expect(his.herLine?.at).toBeGreaterThan(0);
  });

  it("keeps only the latest, never a history", async () => {
    await seat();
    await post("say", { me: HER, text: "first" });
    await post("say", { me: HER, text: "second" });
    expect((await view(HIM)).herLine?.text).toBe("second");
  });

  it("clears when she empties it", async () => {
    await seat();
    await post("say", { me: HER, text: "never mind" });
    await post("say", { me: HER, text: "   " });
    expect((await view(HIM)).herLine).toBeNull();
  });

  it("ignores him leaving one, because he already has thirty notes", async () => {
    await seat();
    await post("say", { me: HIM, text: "sneaking one in" });
    expect((await view(HER)).herLine).toBeNull();
  });

  it("ignores a stranger", async () => {
    await seat();
    await view(STRANGER);
    await post("say", { me: STRANGER, text: "hello" });
    expect((await view(HER)).herLine).toBeNull();
  });

  it("does not show it to somebody who only has the link", async () => {
    await seat();
    await post("say", { me: HER, text: "come sit with me for a bit" });
    const v = await view(STRANGER);
    expect(v.herLine).toBeNull();
    const body = await (await SELF.fetch(`https://x/api/room/${id}?me=${STRANGER}`)).text();
    expect(body).not.toContain("come sit with me");
  });

  it("still reaches both of the people it is for", async () => {
    await seat();
    await post("say", { me: HER, text: "mine to edit, his to read" });
    expect((await view(HIM)).herLine?.text).toBe("mine to edit, his to read");
    expect((await view(HER)).herLine?.text).toBe("mine to edit, his to read");
  });

  it("does not tell a spectator how far into her notes she is", async () => {
    await seat();
    expect((await view(STRANGER)).noteDay).toBeNull();
    expect((await view(HIM)).noteDay).toBe(1);
  });

  it("caps the length instead of rejecting it", async () => {
    await seat();
    await post("say", { me: HER, text: "x".repeat(400) });
    expect((await view(HIM)).herLine?.text).toHaveLength(140);
  });
});

describe("what she leaves him", () => {
  it("is his to find, and never hers or a stranger's", async () => {
    await seat();
    away(9);
    await view(HER);

    expect((await view(HIM)).gift).not.toBeNull();
    expect((await view(HER)).gift).toBeNull();
    expect((await view("strangerstranger")).gift).toBeNull();
  });

  it("is gone the moment he touches anything", async () => {
    await seat();
    away(9);
    await view(HER);
    expect((await view(HIM)).gift).not.toBeNull();

    await post("act", { me: HIM, action: "pet" });
    expect((await view(HIM)).gift).toBeNull();
  });

  it("does not appear when he has only just been in", async () => {
    await seat();
    await view(HER);
    expect((await view(HIM)).gift).toBeNull();
  });
});

describe("the thing she knocks off the shelf", () => {
  it("can be put back by either of them, and by no one else", async () => {
    await seat();
    const knock = async () => {
      for (let i = 0; i < 200 && !(await view(HIM)).shelfDown; i++) await view(HER);
      expect((await view(HIM)).shelfDown).toBe(true);
    };

    const putBack = async (me: string) => {
      const r = await post("shelf", { me });
      expect(r.status).toBe(200);
      const { again } = (await r.json()) as { again: boolean };
      expect((await view(HIM)).shelfDown).toBe(again);
    };

    await knock();
    expect((await post("shelf", { me: "strangerstranger" })).status).toBe(403);
    expect((await view(HIM)).shelfDown).toBe(true);

    await putBack(HER);
    await knock();
    await putBack(HIM);
  });
});

describe("the light in the window", () => {
  it("waits for the other person and disappears when they collect it", async () => {
    await seat();

    expect((await post("window-light", { me: HIM })).status).toBe(200);
    expect((await view(HIM)).windowLight).toBe(false);
    expect((await view(HER)).windowLight).toBe(true);

    const collected = await post("window-light", { me: HER });
    expect(collected.status).toBe(200);
    expect(((await collected.json()) as RoomView).windowLight).toBe(false);
    expect((await view(HIM)).windowLight).toBe(false);
  });

  it("is private to the two seats", async () => {
    await seat();
    await post("window-light", { me: HIM });
    expect((await view(STRANGER)).windowLight).toBe(false);
    expect((await post("window-light", { me: STRANGER })).status).toBe(403);
    expect((await view(HER)).windowLight).toBe(true);
  });
});

describe("putting the mug back", () => {
  // Twelve rather than the twenty-five this started at. A dozen draws of a one-in-three chance is
  // already a one-in-a-hundred-thousand shot at seeing only one outcome, and requests are not free.
  it("always agrees with itself about where the mug ended up", async () => {
    await seat();
    for (let i = 0; i < 12; i++) {
      const said = (await (await post("shelf", { me: HIM })).json()) as { again: boolean };
      expect((await view(HIM)).shelfDown).toBe(said.again);
    }
  });
});

describe("the thing she left, and what happens to it", () => {
  it("tells her he took it, once", async () => {
    await seat();
    away(72);
    await view(HER);
    expect((await view(HIM)).gift).not.toBeNull();

    // He takes it after she looked, not in the same millisecond she looked. See tick() in harness.ts.
    await tick();
    await post("act", { me: HIM, action: "pet" });
    const hers = await view(HER);
    const kept = hers.arrivals.find((arrival) => arrival.kind === "kept");
    expect(kept).toBeTruthy();

    expect((await view(HER)).arrivals.find((a) => a.kind === "kept")).toBeUndefined();
  });

  it("says nothing when there was nothing on the floor", async () => {
    await seat();
    await post("act", { me: HIM, action: "pet" });
    expect((await view(HER)).arrivals.find((a) => a.kind === "kept")).toBeUndefined();
  });

  it("does not tell him about his own picking up", async () => {
    await seat();
    away(72);
    await view(HER);
    await post("act", { me: HIM, action: "pet" });
    expect((await view(HIM)).arrivals.find((a) => a.kind === "kept")).toBeUndefined();
  });
});

describe("shared discoveries", () => {
  it("counts what either of them noticed, for both of them", async () => {
    await seat();
    expect((await post("found", { me: HIM, key: "piano" })).status).toBe(200);
    expect((await post("found", { me: HER, key: "mouse" })).status).toBe(200);

    expect((await view(HIM)).noticed).toBe(2);
    expect((await view(HER)).noticed).toBe(2);
  });

  it("counts a thing they both found once", async () => {
    await seat();
    await post("found", { me: HIM, key: "piano" });
    await post("found", { me: HER, key: "piano" });
    expect((await view(HIM)).noticed).toBe(1);
  });

  it("refuses a key the room does not have", async () => {
    await seat();
    expect((await post("found", { me: HIM, key: "definitely-not-real" })).status).toBe(400);
    expect((await post("found", { me: HIM, key: "__proto__" })).status).toBe(400);
    expect((await view(HIM)).noticed).toBe(0);
  });

  it("ignores a stranger holding the link", async () => {
    await seat();
    expect((await post("found", { me: STRANGER, key: "piano" })).status).toBe(400);
    expect((await view(HIM)).noticed).toBe(0);
  });

  it("tells you the other one found something, without saying what", async () => {
    await seat();
    await view(HIM);
    await post("found", { me: HER, key: "piano" });

    const found = (await view(HIM)).arrivals.filter((a) => a.kind === "found");
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ kind: "found", what: null });
  });

  it("names it once you have found it too", async () => {
    await seat();
    await post("found", { me: HIM, key: "piano" });
    await view(HIM);
    await post("found", { me: HER, key: "piano" });

    const found = (await view(HIM)).arrivals.filter((a) => a.kind === "found");
    expect(found[0]).toMatchObject({ kind: "found", what: "piano" });
  });

  it("does not report your own finds back to you", async () => {
    await seat();
    await view(HIM);
    await post("found", { me: HIM, key: "piano" });
    expect((await view(HIM)).arrivals.filter((a) => a.kind === "found")).toEqual([]);
  });

  it("stops reporting a find once you have seen it", async () => {
    await seat();
    await view(HIM);
    await post("found", { me: HER, key: "piano" });
    expect((await view(HIM)).arrivals.some((a) => a.kind === "found")).toBe(true);
    expect((await view(HIM)).arrivals.some((a) => a.kind === "found")).toBe(false);
  });

  it("shows a spectator nothing", async () => {
    await seat();
    await post("found", { me: HIM, key: "piano" });
    const nosy = await view(STRANGER);
    expect(nosy.noticed).toBe(0);
    expect(nosy.arrivals).toEqual([]);
  });

  it("is quietly fine about being told the same thing twice", async () => {
    await seat();
    expect((await post("found", { me: HIM, key: "piano" })).status).toBe(200);
    expect((await post("found", { me: HIM, key: "piano" })).status).toBe(200);
    expect((await view(HIM)).noticed).toBe(1);
  });
});

describe("the blanket on her bed", () => {
  it("is hers to choose, and nobody else's", async () => {
    await seat();
    expect((await post("blanket", { me: HER, key: "moss", stripe: true })).status).toBe(200);
    expect((await post("blanket", { me: HIM, key: "dusk", stripe: false })).status).toBe(403);
    expect((await post("blanket", { me: "strangerstranger", key: "dusk" })).status).toBe(403);

    expect((await view(HIM)).blanket).toEqual({ key: "moss", stripe: true });
  });

  it("is null until she picks one, so the room keeps the bed it came with", async () => {
    await seat();
    expect((await view(HER)).blanket).toBeNull();
  });

  // Checked in the room and not only at the route. A colour it does not know is a bed drawn with
  // undefined, which paints nothing and leaves a cat-shaped hole where her bed was.
  it("refuses a colour it has never heard of", async () => {
    await seat();
    expect((await post("blanket", { me: HER, key: "chartreuse", stripe: false })).status).toBe(403);
    expect((await post("blanket", { me: HER, key: 7 })).status).toBe(403);
    expect((await view(HER)).blanket).toBeNull();
  });

  it("takes the stripe off again, since taking it off is a choice too", async () => {
    await seat();
    await post("blanket", { me: HER, key: "honey", stripe: true });
    await post("blanket", { me: HER, key: "honey", stripe: false });
    expect((await view(HER)).blanket).toEqual({ key: "honey", stripe: false });
  });

  /*
   * Stays when she goes, like the drawing in the frame and unlike her moods.
   *
   * What leaving promises her is "your moods, your visits, the days you have been in here", and a
   * colour on a bed is none of those. It is a thing in the room rather than a record of her, so it
   * belongs to the room. If that ever changes, the sentence on the leave panel has to change with it.
   */
  it("stays with the room when she leaves, because it is furniture and not a record", async () => {
    await seat();
    await post("blanket", { me: HER, key: "cream", stripe: true });
    await post("leave", { me: HER });

    expect((await view(HIM)).blanket).toEqual({ key: "cream", stripe: true });
    await post("unleave", { me: HER });
    expect((await view(HER)).blanket).toEqual({ key: "cream", stripe: true });
  });
});

describe("the weather in her window", () => {
  it("says clear until the room has managed to find out, never null", async () => {
    await seat();
    expect((await view(HIM)).sky).toBe("clear");
    expect((await view(HER)).sky).toBe("clear");
  });

  // The lookup goes out behind the response. What matters here is that a room whose weather service
  // is unreachable is a room that still opens, at the same speed, with a window that says nothing.
  // The lookup goes out behind the response, so this is really a test that it is behind it: the whole
  // suite points WEATHER_URL at a port that refuses, and a room still opens at full speed with a
  // window that says nothing.
  it("opens at full speed when the sky cannot be reached", async () => {
    await seat();
    const started = Date.now();
    const v = await view(HER);
    expect(v.sky).toBe("clear");
    expect(v.cat).toBeTruthy();
    expect(Date.now() - started).toBeLessThan(1500);
  });
});

describe("the window when she moves", () => {
  // He opens the room before he picks her timezone, so the first lookup is always for the default
  // one. If changing it does not clear what was found, the window shows another city's sky for half
  // an hour, on the one path every room takes.
  it("forgets the sky it found when her timezone changes", async () => {
    await seat();
    const stub = env.ROOM.get(env.ROOM.idFromName(id));
    await runInDurableObject(stub, async (_instance, state) => {
      await state.storage.put("weather", { sky: "rain", at: Date.now() });
    });
    expect((await view(HIM)).sky).toBe("rain");

    await post("clock", { me: HIM, tz: "Europe/London" });
    expect((await view(HIM)).sky).toBe("clear");
  });

  it("keeps it when he changes only the hour she is home", async () => {
    await seat();
    const stub = env.ROOM.get(env.ROOM.idFromName(id));
    await runInDurableObject(stub, async (_instance, state) => {
      await state.storage.put("weather", { sky: "snow", at: Date.now() });
    });

    await post("clock", { me: HIM, homeHour: 19 });
    expect((await view(HIM)).sky).toBe("snow");
  });
});
