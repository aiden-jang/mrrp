import { env, runDurableObjectAlarm, runInDurableObject, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { harness, HER, HIM, STRANGER } from "./harness.js";

const { away, id, post, seat, view } = harness("endingroom");

describe("deleting the room", () => {
  it("takes the cat's name, typed, and not just the button", async () => {
    await seat();
    expect((await post("delete", { me: HIM, name: "not the cat" })).status).toBe(403);
    expect((await view(HIM)).you).not.toBeNull();
  });

  it("is not hers to do, however she asks", async () => {
    await seat();
    expect((await post("delete", { me: HER, name: "Bean" })).status).toBe(403);
    expect((await post("delete", { me: STRANGER, name: "Bean" })).status).toBe(403);
    expect((await view(HIM)).you).not.toBeNull();
  });

  it("accepts the name however it was capitalised or spaced", async () => {
    await seat();
    expect((await post("delete", { me: HIM, name: "  bEaN " })).status).toBe(200);
  });

  it("answers 410 to everyone afterwards, and never reseats", async () => {
    await seat();
    await post("delete", { me: HIM, name: "Bean" });

    const r = await SELF.fetch(`https://x/api/room/${id}?me=${HIM}`);
    expect(r.status).toBe(410);
    // The danger is not a 500. It is a 200 with an empty room in it: view() seats whoever turns up
    // when there are fewer than two people, so a dead link would hand the maker's chair to a stranger.
    expect((await SELF.fetch(`https://x/api/room/${id}?me=${STRANGER}`)).status).toBe(410);
    expect((await post("tell", { me: HER, mood: "good" })).status).toBe(410);
    expect((await post("delete", { me: HIM, name: "Bean" })).status).toBe(410);
  });

  // Deleted and erased are two different things, a week apart. The room is unreachable from the first
  // moment; the week only decides how long it is still possible to change your mind.
  it("keeps the room readable to nobody, but does not erase it yet", async () => {
    await seat();
    await post("say", { me: HER, text: "something of hers" });
    await post("delete", { me: HIM, name: "Bean" });

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
    await post("delete", { me: HIM, name: "Bean" });

    const stub = env.ROOM.get(env.ROOM.idFromName(id));
    away(24 * 8);
    expect(await runDurableObjectAlarm(stub)).toBe(true);

    await runInDurableObject(stub, async (_instance, state) => {
      expect([...(await state.storage.list()).keys()]).toEqual(["deleted"]);
    });
  });

  // The alarm is the only thing in this app that happens without somebody visiting, and this is why:
  // if the erasing only happened on the next request, a room nobody ever opened again would keep
  // everything in it forever, and the delete would be a promise rather than a fact.
  it("erases on the next request too, in case the alarm never ran", async () => {
    await seat();
    await post("delete", { me: HIM, name: "Bean" });

    away(24 * 8);
    expect((await SELF.fetch(`https://x/api/room/${id}?me=${HIM}`)).status).toBe(410);

    const stub = env.ROOM.get(env.ROOM.idFromName(id));
    await runInDurableObject(stub, async (_instance, state) => {
      expect([...(await state.storage.list()).keys()]).toEqual(["deleted"]);
    });
  });

  // The tripwire. Every method reachable from a route has to refuse on a deleted room, and the one
  // that forgets is the one that hands a dead link to a stranger as a fresh room.
  //
  // Adding any method to the Room fails this test until its name is put in one of the two lists
  // below, which is the point: deciding which list is deciding whether a dead room can still be
  // reached through it. TypeScript's `private` is gone by runtime, so the split cannot be detected.
  const INTERNAL = [
    "constructor",
    "guard",
    "roles",
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
    "sweepLeftSide",
    "scheduleNext",
  ];
  // The one method that must answer on a dead room, because it is how the client knows it is dead.
  // The alarm has to run on a deleted room: it is the thing that erases it. The other two are his way
  // back, which by definition only exists while the room is deleted.
  //
  // Her two are NOT on this list, and putting them here is how a real bug got in: she could restore
  // her side into a room he had already deleted, and he would find her back in it after undoing.
  // Being on this list is an escape from the check, so a name belongs here only if a dead room must
  // genuinely answer through it.
  const ANSWERS_WHEN_GONE = ["undoUntil", "undelete", "alarm"];

  it("gives him a week to change his mind, and tells him when it runs out", async () => {
    await seat();
    const r = await post("delete", { me: HIM, name: "Bean" });
    const { undoUntil } = (await r.json()) as { undoUntil: number };
    expect(undoUntil).toBeGreaterThan(Date.now());

    const gone = await SELF.fetch(`https://x/api/room/${id}?me=${HIM}`);
    expect(gone.status).toBe(410);
    expect(((await gone.json()) as { undoUntil: number }).undoUntil).toBe(undoUntil);

    expect((await post("undelete", { me: HIM })).status).toBe(200);
    const back = await view(HIM);
    expect(back.you).toBe("Aiden");
    expect(back.them).toBe("Sofia");
  });

  // She is not told there is a way back, because there is not one for her. The room is gone from her
  // side the moment he does it, which is the only honest thing a delete can mean to the other person.
  it("offers the way back to him and to nobody else", async () => {
    await seat();
    await post("delete", { me: HIM, name: "Bean" });

    for (const who of [HER, STRANGER]) {
      const r = await SELF.fetch(`https://x/api/room/${id}?me=${who}`);
      expect(r.status).toBe(410);
      expect(((await r.json()) as { undoUntil: number | null }).undoUntil).toBeNull();
      expect((await post("undelete", { me: who })).status).toBe(403);
    }
  });

  it("closes the way back when the week is up", async () => {
    await seat();
    await post("delete", { me: HIM, name: "Bean" });

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
    await post("delete", { me: HIM, name: "Bean" });
    await post("undelete", { me: HIM });

    const v = await view(HIM);
    expect(v.herLine?.text).toBe("still here");
    expect(v.catMood).toBe("sad");
    expect((await view(HER)).youAreHer).toBe(true);
  });

  it("refuses every method a route can reach, including ones added after this was written", async () => {
    await seat();
    await post("delete", { me: HIM, name: "Bean" });

    const stub = env.ROOM.get(env.ROOM.idFromName(id));
    await runInDurableObject(stub, async (instance) => {
      const proto = Object.getPrototypeOf(instance) as object;
      const all = Object.getOwnPropertyNames(proto).filter(
        (m) => typeof (instance as unknown as Record<string, unknown>)[m] === "function",
      );
      const unclassified = all.filter((m) => !INTERNAL.includes(m) && !ANSWERS_WHEN_GONE.includes(m));
      expect(unclassified.length).toBeGreaterThan(10);

      for (const name of unclassified) {
        const call = (instance as unknown as Record<string, (...a: unknown[]) => unknown>)[name]!;
        let message = "did not throw";
        try {
          await call.call(instance, HIM, "Bean", null);
        } catch (e) {
          message = (e as Error).message;
        }
        expect(message, `${name}() on a deleted room`).toMatch(/room deleted/);
      }

      // And the list itself is honest: nothing in it has been renamed away.
      for (const name of [...INTERNAL.slice(1), ...ANSWERS_WHEN_GONE]) {
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

  // Leaving that a page load undoes is not leaving. Her own browser is the one thing standing in
  // front of the empty seat she just vacated, so it is the one thing that must not be seated by it.
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

  // His release button exists so the right person can take a seat back. Barring the token it frees
  // would lock out the case it was built for: her browser still holding the seat he just freed.
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
    expect((await view(HIM)).them).toBe("Sofia");
  });

  // The seat is genuinely free the whole week, which is the point of leaving. If he hands it on, her
  // way back closes: two people cannot be the cat, and the new one was not a mistake.
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
    expect(v.theyLeft?.name).toBe("Sofia");
    expect(v.theyLeft?.until).toBeGreaterThan(Date.now());
  });

  // Her deliberation is his to know only because he can end it. A spectator holding the link has no
  // seat to give away and no business knowing she is thinking about it.
  it("tells nobody else, not even the one who left", async () => {
    await seat();
    await post("leave", { me: HER });

    expect((await view(STRANGER)).theyLeft).toBeNull();
    expect((await view(HER)).theyLeft).toBeNull();
  });

  // Neither of them is looking at something the other one is not. That is the whole reason this is a
  // pair of flags computed from the same conditions rather than two features that drifted apart.
  it("tells her he was told, whenever it is telling him", async () => {
    await seat();
    await post("leave", { me: HER });

    expect((await view(HIM)).theyLeft?.name).toBe("Sofia");
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
    expect(v.them).toBe("Someone new");
  });

  it("stops telling him when the week runs out", async () => {
    await seat();
    await post("leave", { me: HER });
    away(24 * 8);
    expect((await view(HIM)).theyLeft).toBeNull();
    expect((await view(HIM)).waitingForThem).toBe(true);
  });

  // She could once put her side back into a room he had already deleted, and he would find her in it
  // after changing his mind. A deleted room is not a place anybody gets to write to, including her.
  it("cannot be undone into a room he has already deleted", async () => {
    await seat();
    await post("leave", { me: HER });
    await post("delete", { me: HIM, name: "Bean" });

    expect((await post("unleave", { me: HER })).status).toBe(410);

    await post("undelete", { me: HIM });
    expect((await view(HIM)).waitingForThem).toBe(true);
  });

  // But his undo does not cost her hers. Her week keeps running underneath his, so if he changes his
  // mind inside it she is still able to change hers.
  it("still lets her come back after he puts the room back", async () => {
    await seat();
    await post("leave", { me: HER });
    await post("delete", { me: HIM, name: "Bean" });
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

  // Deleting the room while her week is still running has to take her side with it. Otherwise the
  // room is erased and a copy of her half sits in storage waiting for an alarm that will not come.
  it("takes what she left with it when he deletes the room", async () => {
    await seat();
    await post("leave", { me: HER });
    await post("delete", { me: HIM, name: "Bean" });

    const stub = env.ROOM.get(env.ROOM.idFromName(id));
    away(24 * 8);
    expect(await runDurableObjectAlarm(stub)).toBe(true);
    await runInDurableObject(stub, async (_instance, state) => {
      expect([...(await state.storage.list()).keys()]).toEqual(["deleted"]);
    });
  });
});

describe("what a deleted room can still be made to keep", () => {
  // Reading a room starts a weather lookup that finishes in a later turn. Delete the room while one
  // is in the air and the answer used to come back and write itself into storage that had just been
  // erased, leaving a key behind that "nothing but the date it went" says is not there.
  it("does not let a weather lookup put a key back after erasing", async () => {
    await seat();
    await view(HER);
    await post("delete", { me: HIM, name: "Bean" });

    const stub = env.ROOM.get(env.ROOM.idFromName(id));
    away(24 * 8);
    expect(await runDurableObjectAlarm(stub)).toBe(true);

    // Long enough for anything still in flight to land.
    await new Promise((resolve) => setTimeout(resolve, 200));
    await runInDurableObject(stub, async (_instance, state) => {
      expect([...(await state.storage.list()).keys()]).toEqual(["deleted"]);
    });
  });
});
