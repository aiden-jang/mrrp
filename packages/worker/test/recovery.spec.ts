import { env, runInDurableObject, SELF } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { harness, AHEAD, BEHIND, HER, HIM, STRANGER } from "./harness.js";

const { id, post, seat, view } = harness("recoveryroom");

describe("taking his seat back", () => {
  const NEWPHONE = "hisnewphonehis";

  it("gives each of them their own code, and a spectator none", async () => {
    await seat();
    const his = (await view(HIM)).recoveryCode;
    const hers = (await view(HER)).recoveryCode;
    const shape = /^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/;
    expect(his).toMatch(shape);
    expect(hers).toMatch(shape);
    expect(his).not.toBe(hers);
    await view(STRANGER);
    expect((await view(STRANGER)).recoveryCode).toBeNull();
  });

  it("stays the same code every time he looks", async () => {
    await seat();
    const a = (await view(HIM)).recoveryCode;
    expect((await view(HIM)).recoveryCode).toBe(a);
  });

  it("hands the seat to a new device, and he is still him", async () => {
    await seat();
    const code = (await view(HIM)).recoveryCode!;
    expect((await post("recover", { me: NEWPHONE, code })).status).toBe(200);

    const restored = await view(NEWPHONE);
    expect(restored.youAreHer).toBe(false);
    expect(restored.them).toBe("Sofia");
    expect(restored.recoveryCode).toBe(code);
    expect((await view(HER)).youAreHer).toBe(true);
  });

  it("keeps him first, so the new device is not handed the cat", async () => {
    await seat();
    const code = (await view(HIM)).recoveryCode!;
    await post("recover", { me: NEWPHONE, code });
    expect((await view(NEWPHONE)).youAreHer).toBe(false);
    expect((await view(HER)).youAreHer).toBe(true);
  });

  it("leaves everything in the room alone", async () => {
    await seat();
    await post("notes", { me: HIM, notes: ["mine to keep"] });
    await post("say", { me: HER, text: "still here" });
    await post("act", { me: HIM, action: "photo" });
    const code = (await view(HIM)).recoveryCode!;
    await post("recover", { me: NEWPHONE, code });

    const v = await view(NEWPHONE);
    expect(v.yourNotes).toEqual(["mine to keep"]);
    expect(v.herLine?.text).toBe("still here");
    expect(v.framed).toBe(true);
  });

  it("refuses a wrong code, and does not evict him for trying", async () => {
    await seat();
    expect((await post("recover", { me: NEWPHONE, code: "aaaa-bbbb-cccc" })).status).toBe(403);
    expect((await view(HIM)).youAreHer).toBe(false);
    expect((await view(HIM)).recoveryCode).not.toBeNull();
  });

  it("will not let her redeem it into holding both seats", async () => {
    await seat();
    const code = (await view(HIM)).recoveryCode!;
    expect((await post("recover", { me: HER, code })).status).toBe(403);
    expect((await view(HER)).youAreHer).toBe(true);
    expect((await view(HIM)).youAreHer).toBe(false);
  });

  it("is a no-op when he already holds the seat", async () => {
    await seat();
    const code = (await view(HIM)).recoveryCode!;
    expect((await post("recover", { me: HIM, code })).status).toBe(200);
    expect((await view(HIM)).youAreHer).toBe(false);
    expect((await view(HER)).youAreHer).toBe(true);
  });

  it("accepts it however he types it", async () => {
    await seat();
    const code = (await view(HIM)).recoveryCode!;
    expect((await post("recover", { me: NEWPHONE, code: `  ${code.toUpperCase()}  ` })).status).toBe(200);
  });
});

describe("taking her seat back", () => {
  const NEW_PHONE = "hernewphone1234";

  it("puts her back in her own seat, not his", async () => {
    await seat();
    const code = (await view(HER)).recoveryCode!;

    expect((await post("recover", { me: NEW_PHONE, code })).status).toBe(200);
    const back = await view(NEW_PHONE);
    expect(back.youAreHer).toBe(true);
    expect((await view(HIM)).youAreHer).toBe(false);
  });

  it("brings how she is with her, so the room does not forget overnight", async () => {
    await seat();
    await post("tell", { me: HER, mood: "tired" });
    const code = (await view(HER)).recoveryCode!;

    await post("recover", { me: NEW_PHONE, code });
    expect((await view(HIM)).catMood).toBe("tired");
  });

  it("keeps what he did for her, which is logged against the seat", async () => {
    await seat();
    await post("act", { me: HIM, action: "brush" });
    const code = (await view(HER)).recoveryCode!;

    await post("recover", { me: NEW_PHONE, code });
    expect((await view(NEW_PHONE)).theirRecent.map((v) => v.action)).toContain("brush");
  });

  it("keeps the collar, which needs both of them on record", async () => {
    await seat();
    await post("found", { me: HIM, key: "herName" });
    await post("found", { me: HER, key: "herName" });
    const code = (await view(HER)).recoveryCode!;

    await post("recover", { me: NEW_PHONE, code });
    expect((await view(NEW_PHONE)).bothCalledHer).toBe(true);
    expect((await view(HIM)).bothCalledHer).toBe(true);
  });

  it("will not let him redeem it and end up holding both seats", async () => {
    await seat();
    const code = (await view(HER)).recoveryCode!;

    expect((await post("recover", { me: HIM, code })).status).toBe(403);
    expect((await view(HER)).youAreHer).toBe(true);
  });

  it("will not let her redeem his and leave the room with no cat", async () => {
    await seat();
    const code = (await view(HIM)).recoveryCode!;

    expect((await post("recover", { me: HER, code })).status).toBe(403);
    expect((await view(HIM)).youAreHer).toBe(false);
  });

  it("stops working once he has freed her seat", async () => {
    await seat();
    const code = (await view(HER)).recoveryCode!;
    await post("release", { me: HIM });

    expect((await post("recover", { me: NEW_PHONE, code })).status).toBe(403);
  });

  it("gives the next person to hold her seat a different code", async () => {
    await seat();
    const first = (await view(HER)).recoveryCode!;
    await post("release", { me: HIM });
    await view(NEW_PHONE, "Bea");

    expect((await view(NEW_PHONE)).recoveryCode).not.toBe(first);
  });
});

describe("freeing her seat", () => {
  const NEWPHONE = "newphonenewphone";

  it("is his to do, and nobody else's", async () => {
    await seat();
    expect((await post("release", { me: HER })).status).toBe(403);
    await view(STRANGER);
    expect((await post("release", { me: STRANGER })).status).toBe(403);
    expect((await post("release", { me: HIM })).status).toBe(200);
  });

  it("does nothing when there is no second seat to free", async () => {
    await view(HIM, "Aiden");
    expect((await post("release", { me: HIM })).status).toBe(403);
  });

  it("lets a new device become her, and leaves his seat alone", async () => {
    await seat();
    await post("release", { me: HIM });
    expect((await view(HIM)).waitingForThem).toBe(true);

    const fresh = await view(NEWPHONE, "Sofia again");
    expect(fresh.youAreHer).toBe(true);
    expect((await view(HIM)).youAreHer).toBe(false);
    expect((await view(HIM)).them).toBe("Sofia again");
  });

  it("keeps her place in the notes, because a lost phone should not cost her three weeks", async () => {
    await seat(BEHIND);
    await view(HER);
    await post("clock", { me: HIM, tz: AHEAD });
    expect((await view(HER)).note!.day).toBe(2);

    await post("release", { me: HIM });
    expect((await view(NEWPHONE, "Sofia again")).note!.day).toBe(2);
  });

  it("keeps the line she left him", async () => {
    await seat();
    await post("say", { me: HER, text: "still true" });
    await post("release", { me: HIM });
    await view(NEWPHONE, "Sofia again");
    expect((await view(HIM)).herLine?.text).toBe("still true");
  });

  it("clears her mood, because a mood is how you are now", async () => {
    await seat();
    await post("tell", { me: HER, mood: "sad" });
    await post("release", { me: HIM });
    await view(NEWPHONE, "Sofia again");
    expect((await view(HIM)).catMood).toBeNull();
  });

  it("does not leave her old visits showing as somebody else's", async () => {
    await seat();
    await post("act", { me: HIM, action: "pet" });
    await post("release", { me: HIM });
    const fresh = await view(NEWPHONE, "Sofia again");
    expect(fresh.theirRecent.map((v) => v.action)).toEqual(["pet"]);
  });

  it("frees exactly one seat, so the room cannot end up with three people", async () => {
    await seat();
    await post("release", { me: HIM });
    await view(NEWPHONE, "Sofia again");
    const late = await view("latecomerlatecomer");
    expect(late.you).toBeNull();
    expect(late.youAreHer).toBe(false);
  });
});

describe("freeing her seat and giving it to a new phone", () => {
  const NEW_PHONE = "handovernewphone";

  it("keeps the collar, which needs both of them on record", async () => {
    await seat();
    await post("found", { me: HIM, key: "herName" });
    await post("found", { me: HER, key: "herName" });
    await post("release", { me: HIM });
    await view(NEW_PHONE, "Sofia");

    expect((await view(HIM)).bothCalledHer).toBe(true);
    expect((await view(NEW_PHONE)).bothCalledHer).toBe(true);
  });

  it("still resets her mood, which is the thing that should not carry over", async () => {
    await seat();
    await post("tell", { me: HER, mood: "sad" });
    await post("release", { me: HIM });
    await view(NEW_PHONE, "Sofia");

    expect((await view(HIM)).catMood).toBeNull();
  });

  it("gives it to the seat, not to him, however many times he looks first", async () => {
    await seat();
    await post("found", { me: HER, key: "piano" });
    await post("release", { me: HIM });
    await view(HIM);
    await view(HIM);
    await view(NEW_PHONE, "Sofia");

    await post("found", { me: HIM, key: "piano" });
    expect((await view(HIM)).noticed).toBe(1);
    expect((await view(NEW_PHONE)).youAreHer).toBe(true);
  });

  it("hands it over once, not to everyone who opens the link afterwards", async () => {
    await seat();
    await post("found", { me: HER, key: "herName" });
    await post("found", { me: HIM, key: "herName" });
    await post("release", { me: HIM });
    await view(NEW_PHONE, "Sofia");
    await view(STRANGER, "Nope");

    expect((await view(NEW_PHONE)).bothCalledHer).toBe(true);
    expect((await view(STRANGER)).you).toBeNull();
  });
});

describe("a seat tied to an account", () => {
  const ME = "acct-user-alice";
  const OTHER = "acct-user-bob";
  const NEW_PHONE = "hernewphone9999";

  const inRoom = async <T>(fn: (room: InstanceType<typeof import("../src/room.js").Room>) => Promise<T>) => {
    const stub = env.ROOM.get(env.ROOM.idFromName(id));
    return runInDurableObject(stub, (instance) => fn(instance as never));
  };

  it("brings her back on a phone that has never held her seat", async () => {
    await seat();
    await inRoom((r) => r.linkAccount(HER, ME, true));

    const v = await inRoom((r) => r.view(NEW_PHONE, "Bea", ME));
    expect(v.youAreHer).toBe(true);
    expect(v.seat).toBe(HER);
    expect(v.linked).toBe(true);
  });

  it("leaves somebody signed into no room here exactly where they were", async () => {
    await seat();
    const v = await inRoom((r) => r.view(HIM, "Aiden", OTHER));
    expect(v.youAreHer).toBe(false);
    expect(v.seat).toBe(HIM);
    expect(v.linked).toBe(false);
  });

  it("refuses one account both seats, which would leave the room with no cat", async () => {
    await seat();
    expect(await inRoom((r) => r.linkAccount(HER, ME, true))).toBe(true);
    expect(await inRoom((r) => r.linkAccount(HIM, ME, true))).toBe(false);

    const v = await inRoom((r) => r.view(NEW_PHONE, "x", ME));
    expect(v.youAreHer).toBe(true);
  });

  it("lets the two of them hold a seat each", async () => {
    await seat();
    expect(await inRoom((r) => r.linkAccount(HIM, ME, true))).toBe(true);
    expect(await inRoom((r) => r.linkAccount(HER, OTHER, true))).toBe(true);

    expect((await inRoom((r) => r.view("newa", "x", ME))).youAreHer).toBe(false);
    expect((await inRoom((r) => r.view("newb", "x", OTHER))).youAreHer).toBe(true);
  });

  it("gives a spectator nothing to tie", async () => {
    await seat();
    expect(await inRoom((r) => r.linkAccount(STRANGER, ME, true))).toBe(false);
  });

  it("stops reaching the seat once untied, and leaves the seat where it is", async () => {
    await seat();
    await inRoom((r) => r.linkAccount(HER, ME, true));
    expect(await inRoom((r) => r.linkAccount(HER, ME, false))).toBe(true);

    expect((await inRoom((r) => r.view(NEW_PHONE, "x", ME))).youAreHer).toBe(false);
    expect((await inRoom((r) => r.view(HER, "Bea"))).youAreHer).toBe(true);
  });
});

/*
 * The seam to the auth service, which the tests above skip.
 *
 * Everything else about accounts is tested by handing the room an account id directly, so all of it
 * starts one step after the question "who is this". That step is `accountOf`, which forwards the
 * session cookie and turns the answer into an id, and nothing covered it at all.
 */
describe("working out who is signed in", () => {
  const room = (me: string, cookie?: string) =>
    SELF.fetch(`https://x/api/room/${id}?me=${me}`, cookie ? { headers: { cookie } } : undefined);

  const link = (me: string, cookie?: string) =>
    SELF.fetch(`https://x/api/room/${id}/link`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify({ me, on: true }),
    });

  it("treats no cookie as signed out, and says so rather than guessing", async () => {
    await seat();
    const r = await room(HER);
    expect(r.status).toBe(200);
    expect(((await r.json()) as { linked: boolean }).linked).toBe(false);
    expect((await link(HER)).status).toBe(401);
  });

  /*
   * The promise in DECISIONS.md, which had never been checked: if the auth service is unreachable the
   * answer is "not signed in", because a room has never needed an account.
   *
   * The failure this guards against is a 500. An outage that only costs you the optional half is a bad
   * afternoon; an outage that takes down every room, including the ones with no account attached to
   * them, is the whole app resting on a service it was designed not to need.
   */
  describe("when the auth service cannot be reached", () => {
    const cookie = "platform_session=whatever-this-is-never-read";
    let realUrl: string;

    beforeEach(() => {
      realUrl = env.AUTH_URL;
      // Refused immediately rather than left hanging, so a broken promise here fails fast.
      env.AUTH_URL = "http://127.0.0.1:1";
    });
    afterEach(() => {
      env.AUTH_URL = realUrl;
    });

    it("leaves the room working for both of them", async () => {
      await seat();
      const r = await room(HIM, cookie);
      expect(r.status).toBe(200);
      const v = (await r.json()) as { you: string | null; linked: boolean };
      expect(v.you).toBe("Aiden");
      expect(v.linked).toBe(false);
    });

    // Reads the room WITH a cookie, so the failing lookup is actually on the path. Without one,
    // `getSessionUser` returns null before it tries to fetch anything and the test proves nothing.
    it("still lets her be the cat, which is the part that never needed an account", async () => {
      await seat();
      expect((await post("tell", { me: HER, mood: "good" })).status).toBe(200);

      const r = await room(HIM, cookie);
      expect(r.status).toBe(200);
      expect(((await r.json()) as { catMood: string | null }).catMood).toBe("good");
    });

    it("turns down the one thing that does need one, without failing", async () => {
      await seat();
      const r = await link(HER, cookie);
      expect(r.status).toBe(401);
      expect(r.status).not.toBe(500);
    });
  });
});
