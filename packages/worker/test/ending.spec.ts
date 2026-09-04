import { env, runDurableObjectAlarm, runInDurableObject, SELF } from "cloudflare:test";
import { describe, expect, it, vi } from "vitest";
import { harness, HER, HIM, STRANGER } from "./harness.js";

const { away, id, post, seat, view } = harness("endingroom");

describe("deleting the room", () => {
  it("takes his own name, typed, and not just the button", async () => {
    await seat();
    expect((await post("delete", { me: HIM, name: "not his name" })).status).toBe(403);
    expect((await view(HIM)).you).not.toBeNull();
  });

  it("is not hers to do, however she asks", async () => {
    await seat();
    expect((await post("delete", { me: HER, name: "Aiden" })).status).toBe(403);
    expect((await post("delete", { me: STRANGER, name: "Aiden" })).status).toBe(403);
    // Her own name, which is the only ask the signature check would otherwise accept from her:
    // it compares against whoever is asking, so "she typed a name that matches" is true for her.
    // Only the rule that this is his to do stops it.
    expect((await post("delete", { me: HER, name: "Sofia" })).status).toBe(403);
    expect((await view(HIM)).you).not.toBeNull();
  });

  it("accepts the name however it was capitalised or spaced", async () => {
    await seat();
    expect((await post("delete", { me: HIM, name: "  aIdEn " })).status).toBe(200);
  });

  it("answers 410 to everyone afterwards, and never reseats", async () => {
    await seat();
    await post("delete", { me: HIM, name: "Aiden" });

    const r = await SELF.fetch(`https://x/api/room/${id}?me=${HIM}`);
    expect(r.status).toBe(410);
    expect((await SELF.fetch(`https://x/api/room/${id}?me=${STRANGER}`)).status).toBe(410);
    expect((await post("tell", { me: HER, mood: "good" })).status).toBe(410);
    expect((await post("delete", { me: HIM, name: "Aiden" })).status).toBe(410);
  });

  it("keeps the room readable to nobody, but does not erase it yet", async () => {
    await seat();
    await post("say", { me: HER, text: "something of hers" });
    await post("delete", { me: HIM, name: "Aiden" });

    const stub = env.ROOM.get(env.ROOM.idFromName(id));
    await runInDurableObject(stub, async (_instance, state) => {
      const left = [...(await state.storage.list()).keys()];
      expect(left).toContain("deleted");
      expect(left).toContain("people");
    });
  });

  it("leaves nothing behind but the date it went, once the week is up", async () => {
    await seat();
    await post("say", { me: HER, text: "something of hers" });
    await post("delete", { me: HIM, name: "Aiden" });

    const stub = env.ROOM.get(env.ROOM.idFromName(id));
    away(24 * 8);
    expect(await runDurableObjectAlarm(stub)).toBe(true);

    await runInDurableObject(stub, async (_instance, state) => {
      expect([...(await state.storage.list()).keys()]).toEqual(["deleted"]);
    });
  });

  it("erases on the next request too, in case the alarm never ran", async () => {
    await seat();
    await post("delete", { me: HIM, name: "Aiden" });

    away(24 * 8);
    expect((await SELF.fetch(`https://x/api/room/${id}?me=${HIM}`)).status).toBe(410);

    const stub = env.ROOM.get(env.ROOM.idFromName(id));
    await runInDurableObject(stub, async (_instance, state) => {
      expect([...(await state.storage.list()).keys()]).toEqual(["deleted"]);
    });
  });

  // Adding any method to the Room fails this until its name goes in one of these two lists, which is
  // the point: choosing a list is choosing whether a dead room can be reached through it. TypeScript's
  // `private` is gone by runtime, so the split cannot be detected.
  const INTERNAL = [
    "constructor",
    "guard",
    "roles",
    "lines",
    "keepLine",
    "recoveryCode",
    "adoptFound",
    "reseatBelongings",
    "found",
    "notes",
    "wipeHerSide",
    "doodleFor",
    "noteFor",
    "build",
    "erase",
    "refreshWeather",
    "bothHere",
    "noteHomecoming",
    "noteFirst",
    "sweepLeftSide",
    "scheduleNext",
    "hereNow",
    "liveTokens",
    "tokenOf",
    "broadcast",
  ];
  const ANSWERS_WHEN_GONE = ["undoUntil", "undelete", "alarm"];
  /*
   * Socket lifecycle, not RPC. These take a WebSocket rather than a seat token, so the call below
   * cannot exercise them; `fetch` refusing a deleted room has its own test in this file.
   */
  const SOCKET = ["fetch", "webSocketMessage", "webSocketClose", "webSocketError"];

  it("gives him a week to change his mind, and tells him when it runs out", async () => {
    await seat();
    const r = await post("delete", { me: HIM, name: "Aiden" });
    const { undoUntil } = (await r.json()) as { undoUntil: number };
    expect(undoUntil).toBeGreaterThan(Date.now());

    const gone = await SELF.fetch(`https://x/api/room/${id}?me=${HIM}`);
    expect(gone.status).toBe(410);
    expect(((await gone.json()) as { undoUntil: number }).undoUntil).toBe(undoUntil);

    expect((await post("undelete", { me: HIM })).status).toBe(200);
    const back = await view(HIM);
    expect(back.you).toBe("Aiden");
    // He sees her as the cat, because she is the cat: the name he chose is the only one she has.
    expect(back.them).toBe(back.cat.name);
  });

  it("offers the way back to him and to nobody else", async () => {
    await seat();
    await post("delete", { me: HIM, name: "Aiden" });

    for (const who of [HER, STRANGER]) {
      const r = await SELF.fetch(`https://x/api/room/${id}?me=${who}`);
      expect(r.status).toBe(410);
      expect(((await r.json()) as { undoUntil: number | null }).undoUntil).toBeNull();
      expect((await post("undelete", { me: who })).status).toBe(403);
    }
  });

  it("closes the way back when the week is up", async () => {
    await seat();
    await post("delete", { me: HIM, name: "Aiden" });

    away(24 * 8);
    expect((await post("undelete", { me: HIM })).status).toBe(403);
    const r = await SELF.fetch(`https://x/api/room/${id}?me=${HIM}`);
    expect(r.status).toBe(410);
    expect(((await r.json()) as { undoUntil: number | null }).undoUntil).toBeNull();
  });

  it("brings back what was in it, not an empty room with the same name", async () => {
    await seat();
    await post("say", { me: HER, text: "still here" });
    await post("tell", { me: HER, mood: "sad" });
    await post("delete", { me: HIM, name: "Aiden" });
    await post("undelete", { me: HIM });

    const v = await view(HIM);
    expect(v.herLine?.text).toBe("still here");
    expect(v.catMood).toBe("sad");
    expect((await view(HER)).youAreHer).toBe(true);
  });

  it("refuses every method a route can reach, including ones added after this was written", async () => {
    await seat();
    await post("delete", { me: HIM, name: "Aiden" });

    const stub = env.ROOM.get(env.ROOM.idFromName(id));
    await runInDurableObject(stub, async (instance) => {
      const proto = Object.getPrototypeOf(instance) as object;
      const all = Object.getOwnPropertyNames(proto).filter(
        (m) => typeof (instance as unknown as Record<string, unknown>)[m] === "function",
      );
      const unclassified = all.filter(
        (m) => !INTERNAL.includes(m) && !ANSWERS_WHEN_GONE.includes(m) && !SOCKET.includes(m),
      );
      expect(unclassified.length).toBeGreaterThan(10);

      for (const name of unclassified) {
        const call = (instance as unknown as Record<string, (...a: unknown[]) => unknown>)[name]!;
        let message = "did not throw";
        try {
          await call.call(instance, HIM, "Aiden", null);
        } catch (e) {
          message = (e as Error).message;
        }
        expect(message, `${name}() on a deleted room`).toMatch(/room deleted/);
      }

      for (const name of [...INTERNAL.slice(1), ...ANSWERS_WHEN_GONE, ...SOCKET]) {
        expect(all, `${name} is listed but no longer exists`).toContain(name);
      }
    });
  });
});

describe("her leaving on her own", () => {
  it("frees her seat and takes her side with her", async () => {
    await seat();
    await post("tell", { me: HER, mood: "sad" });
    expect((await post("leave", { me: HER })).status).toBe(200);

    const v = await view(HIM);
    expect(v.waitingForThem).toBe(true);
    expect(v.catMood).toBeNull();
  });

  it("takes the words she wrote him with her, and the next seat cannot read them", async () => {
    await seat();
    await post("say", { me: HER, text: "something only for him" });
    await post("say", { me: HER, text: "and this one too" });
    await post("leave", { me: HER });

    expect((await view(HIM)).herLine).toBeNull();
    const body = await (await SELF.fetch(`https://x/api/room/${id}?me=${HIM}`)).text();
    expect(body).not.toContain("something only for him");

    // The screen that reads them back is the other way to reach the same words.
    const said = await (await SELF.fetch(`https://x/api/room/${id}/said?me=${HIM}`)).json();
    expect(JSON.stringify(said)).not.toContain("something only for him");
  });

  it("takes the picture she drew with her, and leaves his hanging", async () => {
    await seat();
    await post("draw", { me: HER, cells: "1".repeat(135) });
    await post("leave", { me: HER });
    expect((await view(HIM)).doodle).toBeNull();

    await post("unleave", { me: HER });
    await post("draw", { me: HIM, cells: "2".repeat(135) });
    await post("leave", { me: HER });
    expect((await view(HIM)).doodle).not.toBeNull();
  });

  it("leaves nothing of hers on the floor for the next person to find", async () => {
    await seat();
    await post("gift", { me: HER, gift: "moth" });
    await post("blanket", { me: HER, key: "cream", stripe: true });
    await post("leave", { me: HER });

    const v = await view(HIM);
    expect(v.gift).toBeNull();
    expect(v.blanket).toBeNull();
  });

  it("does not hand her discoveries to whoever takes the empty seat", async () => {
    await seat();
    await post("found", { me: HER, key: "piano" });
    await post("leave", { me: HER });

    const fresh = "somebodyelseentirely";
    await view(fresh, "Someone new");
    const stub = env.ROOM.get(env.ROOM.idFromName(id));
    await runInDurableObject(stub, async (_i, state) => {
      const found = (await state.storage.get<Record<string, Record<string, number>>>("found")) ?? {};
      expect(Object.keys(found.piano ?? {}), "the new seat found none of it").not.toContain(fresh);
    });
  });

  it("still hands them back when he frees her seat for her own new phone", async () => {
    await seat();
    await post("found", { me: HER, key: "piano" });
    await post("release", { me: HIM });

    const newPhone = "hernewphonetoken";
    await view(newPhone, "Sofia again");
    const stub = env.ROOM.get(env.ROOM.idFromName(id));
    await runInDurableObject(stub, async (_i, state) => {
      const found = (await state.storage.get<Record<string, Record<string, number>>>("found")) ?? {};
      expect(Object.keys(found.piano ?? {}), "her way back keeps what she found").toContain(newPhone);
    });
  });

  it("brings her words back if she changes her mind inside the week", async () => {
    await seat();
    await post("say", { me: HER, text: "still true" });
    await post("leave", { me: HER });
    expect((await post("unleave", { me: HER })).status).toBe(200);

    expect((await view(HIM)).herLine?.text).toBe("still true");
  });

  it("brings her picture back with them", async () => {
    await seat();
    await post("draw", { me: HER, cells: "1".repeat(135) });
    await post("leave", { me: HER });
    await post("unleave", { me: HER });

    expect((await view(HIM)).doodle).not.toBeNull();
  });

  it("leaves his room standing, notes and all", async () => {
    await seat();
    await post("notes", { me: HIM, notes: ["one of his", "two of his"] });
    await post("leave", { me: HER });

    const v = await view(HIM);
    expect(v.you).not.toBeNull();
    expect((await SELF.fetch(`https://x/api/room/${id}?me=${HIM}`)).status).toBe(200);
  });

  it("lets the next person she sends the link to take the empty seat", async () => {
    await seat();
    await post("leave", { me: HER });
    expect((await view(STRANGER, "Someone new")).youAreHer).toBe(true);
  });

  it("does not hand the seat straight back to the browser that just left", async () => {
    await seat();
    await post("leave", { me: HER });

    const v = await view(HER);
    expect(v.youAreHer).toBe(false);
    expect(v.you).toBeNull();
    expect(v.youLeft).toBe(true);
    expect((await view(HIM)).waitingForThem).toBe(true);
  });

  it("takes her back on a fresh token, because that is what the way back does", async () => {
    await seat();
    await post("leave", { me: HER });
    const v = await view("herherherher-again");
    expect(v.youAreHer).toBe(true);
    expect(v.youLeft).toBe(false);
  });

  it("does not bar her token when he frees the seat instead", async () => {
    await seat();
    await post("release", { me: HIM });
    const v = await view(HER);
    expect(v.youAreHer).toBe(true);
    expect(v.youLeft).toBe(false);
  });

  it("is not his to do, and not a stranger's", async () => {
    await seat();
    expect((await post("leave", { me: HIM })).status).toBe(403);
    expect((await post("leave", { me: STRANGER })).status).toBe(403);
    expect((await view(HER)).youAreHer).toBe(true);
  });

  it("gives her a week to put her side back, exactly as it was", async () => {
    await seat();
    await post("tell", { me: HER, mood: "sad" });
    await post("act", { me: HIM, action: "brush" });
    await post("leave", { me: HER });

    const after = await view(HER);
    expect(after.youLeft).toBe(true);
    expect(after.undoLeaveUntil).toBeGreaterThan(Date.now());

    expect((await post("unleave", { me: HER })).status).toBe(200);
    const back = await view(HER);
    expect(back.youAreHer).toBe(true);
    expect(back.catMood).toBe("sad");
    const his = await view(HIM);
    // He sees her as the cat, because she is the cat: the name he chose is the only one she has.
    expect(his.them).toBe(his.cat.name);
  });

  it("closes her way back the moment somebody else takes the seat", async () => {
    await seat();
    await post("leave", { me: HER });
    expect((await view(STRANGER, "Someone new")).youAreHer).toBe(true);

    expect((await view(HER)).undoLeaveUntil).toBeNull();
    expect((await post("unleave", { me: HER })).status).toBe(403);
    expect((await view(STRANGER)).youAreHer).toBe(true);
  });

  it("closes her way back when the week is up, and forgets what she left", async () => {
    await seat();
    await post("leave", { me: HER });

    away(24 * 8);
    expect((await view(HER)).undoLeaveUntil).toBeNull();
    expect((await post("unleave", { me: HER })).status).toBe(403);

    const stub = env.ROOM.get(env.ROOM.idFromName(id));
    await runInDurableObject(stub, async (_instance, state) => {
      expect([...(await state.storage.list()).keys()]).not.toContain("leftSide");
    });
  });

  it("forgets what she left on the alarm too, in a room nobody opens again", async () => {
    await seat();
    await post("leave", { me: HER });

    const stub = env.ROOM.get(env.ROOM.idFromName(id));
    away(24 * 8);
    expect(await runDurableObjectAlarm(stub)).toBe(true);
    await runInDurableObject(stub, async (_instance, state) => {
      expect([...(await state.storage.list()).keys()]).not.toContain("leftSide");
    });
  });

  it("tells him she left and may be back, so he knows what giving the seat away costs", async () => {
    await seat();
    await post("leave", { me: HER });

    const v = await view(HIM);
    // The seat that left is hers, so it is her name he is told, not the placeholder on her record.
    expect(v.theyLeft?.name).toBe(v.cat.name);
    expect(v.theyLeft?.until).toBeGreaterThan(Date.now());
  });

  it("tells nobody else, not even the one who left", async () => {
    await seat();
    await post("leave", { me: HER });

    expect((await view(STRANGER)).theyLeft).toBeNull();
    expect((await view(HER)).theyLeft).toBeNull();
  });

  it("tells her he was told, whenever it is telling him", async () => {
    await seat();
    await post("leave", { me: HER });

    const his = await view(HIM);
    // The seat that left is hers, so it is her name he is told, not the placeholder on her record.
    expect(his.theyLeft?.name).toBe(his.cat.name);
    expect((await view(HER)).theyWereTold).toBe("Aiden");
  });

  it("tells nobody else who was told", async () => {
    await seat();
    await post("leave", { me: HER });
    expect((await view(STRANGER)).theyWereTold).toBeNull();
    expect((await view(HIM)).theyWereTold).toBeNull();
  });

  it("stops telling her he knows exactly when it stops telling him", async () => {
    await seat();
    await post("leave", { me: HER });
    await view(STRANGER, "Someone new");

    expect((await view(HIM)).theyLeft).toBeNull();
    expect((await view(HER)).theyWereTold).toBeNull();
  });

  it("stops telling him once somebody else has taken the seat", async () => {
    await seat();
    await post("leave", { me: HER });
    await view(STRANGER, "Someone new");

    const v = await view(HIM);
    expect(v.theyLeft).toBeNull();
    // He sees her as the cat, because she is the cat: the name he chose is the only one she has.
    expect(v.them).toBe(v.cat.name);
  });

  it("stops telling him when the week runs out", async () => {
    await seat();
    await post("leave", { me: HER });
    away(24 * 8);
    expect((await view(HIM)).theyLeft).toBeNull();
    expect((await view(HIM)).waitingForThem).toBe(true);
  });

  it("cannot be undone into a room he has already deleted", async () => {
    await seat();
    await post("leave", { me: HER });
    await post("delete", { me: HIM, name: "Aiden" });

    expect((await post("unleave", { me: HER })).status).toBe(410);

    await post("undelete", { me: HIM });
    expect((await view(HIM)).waitingForThem).toBe(true);
  });

  it("still lets her come back after he puts the room back", async () => {
    await seat();
    await post("leave", { me: HER });
    await post("delete", { me: HIM, name: "Aiden" });
    await post("undelete", { me: HIM });

    expect((await view(HER)).undoLeaveUntil).toBeGreaterThan(Date.now());
    expect((await post("unleave", { me: HER })).status).toBe(200);
    expect((await view(HER)).youAreHer).toBe(true);
  });

  it("is not his to undo, and not a stranger's", async () => {
    await seat();
    await post("leave", { me: HER });
    expect((await post("unleave", { me: HIM })).status).toBe(403);
    expect((await post("unleave", { me: STRANGER })).status).toBe(403);
    expect((await view(HIM)).waitingForThem).toBe(true);
  });

  it("takes what she left with it when he deletes the room", async () => {
    await seat();
    await post("leave", { me: HER });
    await post("delete", { me: HIM, name: "Aiden" });

    const stub = env.ROOM.get(env.ROOM.idFromName(id));
    away(24 * 8);
    expect(await runDurableObjectAlarm(stub)).toBe(true);
    await runInDurableObject(stub, async (_instance, state) => {
      expect([...(await state.storage.list()).keys()]).toEqual(["deleted"]);
    });
  });
});

describe("what a deleted room can still be made to keep", () => {
  it("stops offering to put the room back once the week is up", async () => {
    await seat();
    const gone = await post("delete", { me: HIM, name: "Aiden" });
    expect(gone.status).toBe(200);

    // The offer is live for the week the tombstone lasts, and not one request longer.
    const stub = env.ROOM.get(env.ROOM.idFromName(id));
    expect(await runInDurableObject(stub, (instance) => instance.undoUntil(HIM))).not.toBeNull();
    away(24 * 8);
    expect(await runInDurableObject(stub, (instance) => instance.undoUntil(HIM))).toBeNull();
  });

  it("will not delete the room for somebody who cannot type his own name", async () => {
    await seat();
    // His name, never hers. Asking for hers would be asking him to type her out of the room.
    expect((await post("delete", { me: HIM, name: "Bean" })).status).toBe(403);
    // Empty never reaches the room: the route wants a name before it asks whether it is the right one.
    expect((await post("delete", { me: HIM, name: "" })).status).toBe(400);
    expect((await view(HER)).them, "still a room").toBe("Aiden");

    expect(
      (await post("delete", { me: HIM, name: "  aiden  " })).status,
      "spacing and case are not the point",
    ).toBe(200);
  });

  it("does not let a weather lookup put a key back after erasing", async () => {
    /*
     * The lookup has to succeed and land late, or nothing ever reaches the tombstone check. Held
     * open until after the alarm, which is the only ordering that puts a write behind an erase.
     */
    let land = () => {};
    const held = new Promise<void>((resolve) => {
      land = resolve;
    });
    const realFetch = globalThis.fetch;
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const to = String(input instanceof Request ? input.url : input);
      if (!to.includes("weather.test")) return realFetch(input as RequestInfo, init);
      await held;
      return new Response(JSON.stringify({ current: { weather_code: 71 } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    env.WEATHER_URL = "https://weather.test/forecast";

    await seat();
    await view(HER);
    await post("delete", { me: HIM, name: "Aiden" });

    const stub = env.ROOM.get(env.ROOM.idFromName(id));
    away(24 * 8);
    expect(await runDurableObjectAlarm(stub)).toBe(true);

    land();
    await vi.waitFor(() =>
      runInDurableObject(stub, async (_instance, state) => {
        expect([...(await state.storage.list()).keys()]).toEqual(["deleted"]);
      }),
    );
    vi.unstubAllGlobals();
  });
});

describe("a first that lands after the room is gone", () => {
  it("is not written into a room that has been deleted", async () => {
    await seat();
    await post("delete", { me: HIM, name: "Aiden" });

    const stub = env.ROOM.get(env.ROOM.idFromName(id));
    await runInDurableObject(stub, async (instance) => {
      await (instance as unknown as { noteFirst: (w: string) => Promise<void> }).noteFirst("snow");
    });
    await runInDurableObject(stub, async (_i, state) => {
      expect([...(await state.storage.list()).keys()]).not.toContain("firsts");
    });
  });
});

describe("asking whether a room is still there", () => {
  it("answers without taking the seat it is asking about", async () => {
    await view(HIM, "Aiden");
    const r = await SELF.fetch(`https://x/api/room/${id}/alive`);
    expect(r.status).toBe(200);
    // The door screen asks this before it invites anybody in. If it seated them, it would be
    // taking the seat by asking, which is the one thing the door exists to prevent.
    expect((await view(HIM)).them).toBeNull();
  });

  it("says gone for a deleted room, so a dead link is not answered with an invitation", async () => {
    await seat();
    await post("delete", { me: HIM, name: "Aiden" });
    const r = await SELF.fetch(`https://x/api/room/${id}/alive`);
    expect(r.status).toBe(410);
  });
});
