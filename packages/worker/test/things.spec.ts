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

  it("keeps the ones before it, so a week away is a week of them", async () => {
    await seat();
    await view(HIM);
    await post("say", { me: HER, text: "first" });
    await post("say", { me: HER, text: "second" });

    const his = await view(HIM);
    expect(his.herLine?.text).toBe("second");
    const said = his.arrivals.filter((a) => a.kind === "line").map((a) => a.text);
    expect(said).toEqual(["second", "first"]);
  });

  it("stops at twelve, so the card is not an inbox", async () => {
    await seat();
    for (let n = 0; n < 15; n++) await post("say", { me: HER, text: `line ${n}` });

    const copy = (await (await SELF.fetch(`https://x/api/room/${id}/export?me=${HER}`)).json()) as {
      herLines: { text: string }[];
    };
    expect(copy.herLines).toHaveLength(12);
    expect(copy.herLines[0]!.text).toBe("line 14");
    expect(copy.herLines.at(-1)!.text).toBe("line 3");
  });

  it("clears all of them when she empties it, not just the newest", async () => {
    await seat();
    await post("say", { me: HER, text: "first" });
    await post("say", { me: HER, text: "second" });
    await post("say", { me: HER, text: "  " });

    expect((await view(HIM)).herLine).toBeNull();
    const copy = (await (await SELF.fetch(`https://x/api/room/${id}/export?me=${HER}`)).json()) as {
      herLines: unknown[];
    };
    expect(copy.herLines).toEqual([]);
  });

  it("carries her words with the thing she left on the floor", async () => {
    await seat();
    await view(HIM);
    await post("gift", { me: HER, gift: "moth", text: "he was on the window" });

    const said = (await view(HIM)).arrivals.find((a) => a.kind === "line");
    expect(said).toMatchObject({ text: "he was on the window", gift: "moth" });
  });

  it("names the moth once, not once as a gift and again as a line", async () => {
    await seat();
    await view(HIM);
    await post("gift", { me: HER, gift: "moth", text: "he was on the window" });

    const arrivals = (await view(HIM)).arrivals;
    expect(arrivals.filter((a) => a.kind === "line")).toHaveLength(1);
    expect(arrivals.filter((a) => a.kind === "action" && a.action === "gift")).toHaveLength(0);
  });

  it("still announces a gift she sent with no words", async () => {
    await seat();
    await view(HIM);
    await post("gift", { me: HER, gift: "moth" });

    const arrivals = (await view(HIM)).arrivals;
    expect(arrivals.filter((a) => a.kind === "action" && a.action === "gift")).toHaveLength(1);
  });

  it("leaves the gift alone when she sends it without words", async () => {
    await seat();
    await view(HIM);
    await post("gift", { me: HER, gift: "leaf" });
    expect((await view(HIM)).arrivals.some((a) => a.kind === "line")).toBe(false);
  });

  it("marks a line as an answer to the note it answers", async () => {
    await seat();
    await view(HER);
    await post("say", { me: HER, text: "this one made me laugh", aboutDay: 0 });

    const answer = (await view(HIM)).arrivals.find((a) => a.kind === "line");
    expect(answer).toMatchObject({ text: "this one made me laugh" });
    // It carries his note, so the card can show the pair rather than a day number.
    expect(answer && "note" in answer ? answer.note : undefined).toBeTruthy();
  });

  it("keeps a line she aims at a note she has not read, but not the note it claims", async () => {
    await seat();
    await view(HER);
    await post("say", { me: HER, text: "peeking ahead", aboutDay: 9 });

    const answer = (await view(HIM)).arrivals.find((a) => a.kind === "line");
    expect(answer).toMatchObject({ text: "peeking ahead" });
    expect(answer && "note" in answer ? answer.note : undefined).toBeUndefined();
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
  it("is his to find, hers to see she left it, and never a stranger's", async () => {
    await seat();
    away(9);
    await view(HER);

    // He is the one who finds it and picks it up. She can see it because she chooses it now, and
    // choosing something you cannot see is choosing into the dark.
    expect((await view(HIM)).gift).not.toBeNull();
    expect((await view(HER)).gift).not.toBeNull();
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

describe("what the other one has been doing", () => {
  it("is for the two of them, and not for whoever holds the link", async () => {
    await seat();
    await post("heract", { me: HER, act: "shelf" });

    expect((await view(HIM)).theirRecent.map((v) => v.action)).toContain("shelf");
    // She is told about him and he about her. A stranger is told nothing: this used to be keyed on
    // "am I her", which excluded strangers by accident, and making it symmetric handed her doings out.
    expect((await view("strangerstranger")).theirRecent).toEqual([]);
  });
});

describe("the box", () => {
  it("has to be put out by him before she can get into it", async () => {
    await seat();

    // Putting one out is a person's doing; getting into it is a cat's. They used to be one event,
    // so she summoned a box from nowhere and was already sitting in it.
    await post("heract", { me: HER, act: "box" });
    expect((await view(HER)).box).toBe(false);

    expect((await post("boxout", { me: HIM })).status).toBe(200);
    expect((await view(HER)).boxOut).toBe(true);

    await post("heract", { me: HER, act: "box" });
    expect((await view(HER)).box).toBe(true);
  });

  it("is not hers to put out", async () => {
    await seat();
    await post("boxout", { me: HER });
    expect((await view(HER)).boxOut).toBe(false);
  });
});

describe("what he leaves out for her", () => {
  it("waits for her, is his to leave, and is found exactly once", async () => {
    await seat();
    expect((await post("leaveout", { me: HER, treat: "catnip" })).status).toBe(200);
    // Hers is a no-op: leaving something out is his half of the gift she leaves him.
    expect((await view(HER)).forHer).toBeNull();

    expect((await post("leaveout", { me: HIM, treat: "yarn" })).status).toBe(200);

    // He sees it waiting, or leaving something out is a button that appears to do nothing. Looking
    // at it must not spend it: only being handed it to her counts as her finding it.
    expect((await view(HIM)).forHer).toBe("yarn");
    expect((await view(HIM)).forHer).toBe("yarn");

    expect((await view(HER)).forHer).toBe("yarn");
    // Being handed it is what finding it means, so the same read spends it.
    expect((await view(HER)).forHer).toBeNull();
    // And it is gone from his side too, which is how he can tell she has been in.
    expect((await view(HIM)).forHer).toBeNull();
  });

  it("tells her in words, not only by playing it once", async () => {
    // The animation runs five or six seconds, once, and does not run at all when the cat is at the
    // door -- which is what she does when somebody opens the room. The card is what cannot be missed.
    await seat();
    away(9);
    await post("leaveout", { me: HIM, treat: "yarn" });

    const hers = await view(HER);
    expect(hers.forHer).toBe("yarn");
    expect(hers.arrivals.some((a) => a.kind === "brought" && a.treat === "yarn")).toBe(true);
  });

  it("tells him she found it", async () => {
    await seat();
    await post("leaveout", { me: HIM, treat: "treat" });
    await view(HER);

    away(9);
    const arrivals = (await view(HIM)).arrivals;
    expect(arrivals.some((a) => a.kind === "took" && a.treat === "treat")).toBe(true);
  });
});

describe("the thing she knocks off the shelf", () => {
  it("can be put back by either of them, and by no one else", async () => {
    await seat();
    const knock = async () => {
      expect((await post("heract", { me: HER, act: "shelf" })).status).toBe(200);
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

describe("the room's dice", () => {
  // The shelf is hers to knock off, so the room must never do it for her. Fifty reads is a 1 in
  // 20,000,000 chance of seeing nothing if the old 18% roll ever comes back.
  it("never knocks the mug off on her behalf, however many times she looks in", async () => {
    await seat();
    for (let i = 0; i < 50; i++) await view(HER);
    expect((await view(HIM)).shelfDown).toBe(false);
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

  it("goes when she leaves, so nobody sits down to somebody else's choice", async () => {
    await seat();
    await post("blanket", { me: HER, key: "cream", stripe: true });
    await post("leave", { me: HER });

    expect((await view(HIM)).blanket).toBeNull();
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

describe("the thing she only does for both of you", () => {
  it("cannot be found by one person on their own", async () => {
    await view(HIM, "Aiden");
    expect((await post("found", { me: HIM, key: "belly" })).status).toBe(400);
  });

  it("is recorded when both of them have been here just now", async () => {
    await seat();
    expect((await post("found", { me: HER, key: "belly" })).status).toBe(200);
    expect((await view(HER)).noticed).toBeGreaterThan(0);
  });

  it("stops counting once the other one has been gone a while", async () => {
    await seat();
    away(2);
    await view(HER);
    expect((await post("found", { me: HER, key: "belly" })).status).toBe(400);
  });

  it("is still not a stranger's to find, however many people are in", async () => {
    await seat();
    expect((await post("found", { me: STRANGER, key: "belly" })).status).toBe(400);
  });
});

describe("a drawing from before the sheet grew", () => {
  const hang = async (cells: string) => {
    const stub = env.ROOM.get(env.ROOM.idFromName(id));
    await runInDurableObject(stub, async (_instance, state) => {
      await state.storage.put("doodle", { cells, by: HER, at: Date.now() });
    });
  };

  it("brings a seven-by-five back, centred", async () => {
    await seat();
    await hang("1" + "0".repeat(34));
    const seen = (await view(HIM)).doodle;
    expect(seen?.cells).toHaveLength(135);
    expect(seen?.cells[2 * 15 + 4]).toBe("1");
    expect(seen?.cells.replace(/0/g, "")).toBe("1");
  });

  it("brings an eleven-by-seven back, centred", async () => {
    await seat();
    await hang("1" + "0".repeat(76));
    const seen = (await view(HIM)).doodle;
    expect(seen?.cells).toHaveLength(135);
    expect(seen?.cells[1 * 15 + 2]).toBe("1");
    expect(seen?.cells.replace(/0/g, "")).toBe("1");
  });

  it("will not take an old size as a new drawing", async () => {
    await seat();
    expect((await post("draw", { me: HER, cells: "1" + "0".repeat(34) })).status).toBe(400);
    expect((await post("draw", { me: HER, cells: "1" + "0".repeat(76) })).status).toBe(400);
    expect((await post("draw", { me: HER, cells: "1" + "0".repeat(134) })).status).toBe(200);
  });
});

describe("the first time the world does something here", () => {
  const setSky = async (sky: string) => {
    const stub = env.ROOM.get(env.ROOM.idFromName(id));
    await runInDurableObject(stub, async (instance) => {
      await (instance as unknown as { noteFirst: (w: string) => Promise<void> }).noteFirst(sky);
    });
  };

  it("keeps the first snow, and keeps only the first", async () => {
    await seat();
    await view(HER);
    await setSky("snow");

    const first = (await view(HER)).arrivals.find((a) => a.kind === "first");
    expect(first).toBeTruthy();
    expect(first && "what" in first && first.what).toBe("snow");

    const stub = env.ROOM.get(env.ROOM.idFromName(id));
    const at = await runInDurableObject(stub, async (_i, state) => {
      const f = await state.storage.get<Record<string, number>>("firsts");
      return f!.snow;
    });
    await setSky("snow");
    const again = await runInDurableObject(stub, async (_i, state) => {
      const f = await state.storage.get<Record<string, number>>("firsts");
      return f!.snow;
    });
    expect(again).toBe(at);
  });

  it("tells both of them, because it happened to the room", async () => {
    await seat();
    await view(HIM);
    await view(HER);
    await setSky("rain");

    for (const who of [HIM, HER]) {
      expect((await view(who)).arrivals.some((a) => a.kind === "first")).toBe(true);
    }
  });

  it("stops mentioning it once you have seen it", async () => {
    await seat();
    await setSky("snow");
    expect((await view(HIM)).arrivals.some((a) => a.kind === "first")).toBe(true);
    expect((await view(HIM)).arrivals.some((a) => a.kind === "first")).toBe(false);
  });
});

describe("taking the box away again", () => {
  it("comes out and goes back in on the same button", async () => {
    await seat();
    expect((await post("boxout", { me: HIM, on: true })).status).toBe(200);
    expect((await view(HER)).boxOut).toBe(true);
    expect((await post("boxout", { me: HIM, on: false })).status).toBe(200);
    expect((await view(HER)).boxOut).toBe(false);
  });

  it("will not be taken out from under her", async () => {
    await seat();
    await post("boxout", { me: HIM, on: true });
    await post("heract", { me: HER, act: "box" });
    expect((await view(HER)).box).toBe(true);

    await post("boxout", { me: HIM, on: false });
    // Rule one. Nothing in this room goes wrong for the cat, and this is the smallest version of it.
    expect((await view(HER)).boxOut).toBe(true);
    expect((await view(HER)).box).toBe(true);
  });

  it("is still his alone to take away", async () => {
    await seat();
    await post("boxout", { me: HIM, on: true });
    await post("boxout", { me: HER, on: false });
    expect((await view(HER)).boxOut).toBe(true);
  });
});

describe("getting out of the box again", () => {
  it("is the same button, both ways", async () => {
    await seat();
    await post("boxout", { me: HIM, on: true });
    await post("heract", { me: HER, act: "box" });
    expect((await view(HER)).box).toBe(true);

    await post("heract", { me: HER, act: "box" });
    expect((await view(HER)).box, "back out").toBe(false);
    await post("heract", { me: HER, act: "box" });
    expect((await view(HER)).box, "and in again").toBe(true);
  });

  it("does not log her getting out, only her getting in", async () => {
    await seat();
    await post("boxout", { me: HIM, on: true });
    await post("heract", { me: HER, act: "box" });
    await tick();
    await post("heract", { me: HER, act: "box" });
    // The room shows her leaving it. "Got out of the box again" is not news.
    expect((await view(HIM)).theirRecent.filter((v) => v.action === "box")).toHaveLength(1);
  });

  it("unblocks his button, so he can take the box away once she is out", async () => {
    await seat();
    await post("boxout", { me: HIM, on: true });
    await post("heract", { me: HER, act: "box" });
    await post("boxout", { me: HIM, on: false });
    expect((await view(HER)).boxOut, "not while she is in it").toBe(true);

    await post("heract", { me: HER, act: "box" });
    await post("boxout", { me: HIM, on: false });
    expect((await view(HER)).boxOut, "but yes once she is out").toBe(false);
  });

  it("still refuses to let her into a box that is not there", async () => {
    await seat();
    await post("heract", { me: HER, act: "box" });
    expect((await view(HER)).box).toBe(false);
  });
});

describe("a mark left last thing at night", () => {
  it("is still there when she wakes up, even though her day rolled over", async () => {
    await seat();
    await tick(50);
    await post("act", { me: HIM, action: "brush" });

    away(24);
    // Her midnight has been and gone. Under the day rule alone this was the case that lost a brush
    // an hour after he left it, which is exactly the one she was most likely to have missed.
    expect((await view(HIM)).brushed, "she has not looked yet").toBe(true);
  });

  it("goes once she has been in and seen it", async () => {
    await seat();
    await tick(50);
    await post("act", { me: HIM, action: "sit" });

    away(24);
    await view(HER);
    away(24);
    expect((await view(HIM)).satWith, "seen, and a day past").toBe(false);
  });

  it("still clears at her midnight once she has looked, rather than lingering", async () => {
    await seat();
    await post("act", { me: HIM, action: "brush" });
    await view(HER);
    expect((await view(HER)).brushed, "same day, still there").toBe(true);

    away(24);
    expect((await view(HIM)).brushed).toBe(false);
  });
});

describe("the first time he reaches her", () => {
  it("is remembered, once, and only when she was there to feel it", async () => {
    await seat();
    // She was seated a moment ago, so she is here.
    await post("hold", { me: HIM, on: true });
    await post("hold", { me: HIM, on: false });
    await tick(20);
    await post("hold", { me: HIM, on: true });

    const firsts = (await view(HER)).arrivals.filter((a) => a.kind === "first" && a.what === "held");
    expect(firsts.length, "a first that happens twice is not a first").toBeLessThanOrEqual(1);
  });

  it("is not recorded for a hold nobody was there for", async () => {
    await seat();
    away(1);
    // An hour later she is long gone, and a hand in an empty room is not the moment.
    await post("hold", { me: HIM, on: true });
    const v = await view(HER);
    expect(v.arrivals.some((a) => a.kind === "first" && a.what === "held")).toBe(false);
  });
});
