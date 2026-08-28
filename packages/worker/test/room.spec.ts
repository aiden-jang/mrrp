import { env, runInDurableObject, SELF } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NOTES } from "../src/notes.js";
import type { Mood, RoomView } from "../src/types.js";

// UTC-12 and UTC+14, so these two are 26 hours apart and their local dates ALWAYS differ. New York
// to Tokyo is only +13 and shares a date part of the time, which made these tests pass in the
// evening and fail in the morning. A test that depends on when you run it is worse than no test.
const BEHIND = "Etc/GMT+12";
const AHEAD = "Pacific/Kiritimati";

const HIM = "himhimhimhim";
const HER = "herherherher";
const STRANGER = "strangerstranger";

let room = 0;
let id = "";

// DEV_TOOLS is set here and not read from `.dev.vars`, which is gitignored: the fast-forward tests
// passed on my machine and failed on a fresh clone. The closed-door test takes it away itself.
beforeEach(() => {
  id = `t${String(++room).padStart(6, "0")}`;
  env.DEV_TOOLS = "on";
});

// `away()` moves the system clock. Put it back, or every later test inherits the jump.
afterEach(() => {
  vi.useRealTimers();
});

const view = async (me: string, name?: string): Promise<RoomView> => {
  const q = new URLSearchParams({ me });
  if (name) q.set("name", name);
  const r = await SELF.fetch(`https://x/api/room/${id}?${q}`);
  expect(r.status).toBe(200);
  return r.json();
};

const post = (path: string, body: unknown) =>
  SELF.fetch(`https://x/api/room/${id}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

function away(hours: number): void {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(Date.now() + hours * 60 * 60 * 1000));
}

// Seat both people. Pass `tz` to pin the room's clock BEFORE her first read, which the note tests
// depend on: her day is recorded from whatever zone is in force the first time she reads. The two
// zones above differ from each other always; that says nothing about the one the room starts on.
async function seat(tz?: string) {
  await view(HIM, "Aiden");
  if (tz) await post("clock", { me: HIM, tz });
  await view(HER, "Sofia");
}

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

  it("only lets him set whose day the room runs on", async () => {
    await seat();
    expect((await post("clock", { me: HER, tz: "Asia/Tokyo" })).status).toBe(403);
    expect((await post("clock", { me: HIM, tz: "Asia/Seoul", homeHour: 20 })).status).toBe(200);
    const v = await view(HER);
    expect(v.clock).toEqual({ tz: "Asia/Seoul", homeHour: 20 });
  });

  // Unvalidated, this string reaches Intl.DateTimeFormat inside the room and takes the room down.
  it("rejects a timezone the runtime doesn't know", async () => {
    await seat();
    expect((await post("clock", { me: HIM, tz: "Mars/Olympus" })).status).toBe(400);
    expect((await post("clock", { me: HIM, homeHour: 99 })).status).toBe(400);
    expect((await view(HER)).clock.tz).toBe("America/New_York");
  });
});

describe("notes", () => {
  it("starts her on the first one once both are here", async () => {
    await seat();
    const v = await view(HER);
    expect(v.note).toEqual({ day: 1, total: NOTES.length, text: NOTES[0], final: false });
  });

  it("sends only today's text, never the rest", async () => {
    await seat();
    const body = await (await SELF.fetch(`https://x/api/room/${id}?me=${HER}`)).text();
    expect(body).toContain(NOTES[0]!.slice(0, 30));
    expect(body).not.toContain(NOTES[1]!.slice(0, 30));
  });

  it("does not advance while she reads the same day", async () => {
    await seat();
    for (let i = 0; i < 5; i++) expect((await view(HER)).note!.day).toBe(1);
  });

  it("does not advance when he polls", async () => {
    await seat();
    for (let i = 0; i < 20; i++) await view(HIM);
    expect((await view(HER)).note!.day).toBe(1);
  });

  it("does not advance for a stranger", async () => {
    await seat();
    for (let i = 0; i < 5; i++) await view(STRANGER);
    expect((await view(HER)).note!.day).toBe(1);
  });

  it("gives him the day number but never the words", async () => {
    await seat();
    const his = await view(HIM);
    expect(his.note).toBeNull();
    expect(his.noteDay).toBe(1);
  });

  it("advances by exactly one when her day rolls over", async () => {
    await seat(BEHIND);
    expect((await view(HER)).note!.day).toBe(1);

    await post("clock", { me: HIM, tz: AHEAD });
    expect((await view(HER)).note!.day).toBe(2);
    expect((await view(HER)).note!.day).toBe(2);
  });

  it("never goes backwards if her clock moves back", async () => {
    await seat(BEHIND);
    await view(HER);
    await post("clock", { me: HIM, tz: AHEAD });
    expect((await view(HER)).note!.day).toBe(2);

    await post("clock", { me: HIM, tz: BEHIND });
    expect((await view(HER)).note!.day).toBe(2);
  });
});

describe("writing his own notes", () => {
  it("is his to do, and nobody else's", async () => {
    await seat();
    expect((await post("notes", { me: HER, notes: ["nope"] })).status).toBe(403);
    await view(STRANGER);
    expect((await post("notes", { me: STRANGER, notes: ["nope"] })).status).toBe(403);
    expect((await post("notes", { me: HIM, notes: ["mine"] })).status).toBe(200);
  });

  it("replaces the defaults entirely, and she reads his instead", async () => {
    await seat();
    await post("notes", { me: HIM, notes: ["the first thing I want to say", "the second"] });
    const n = (await view(HER)).note!;
    expect(n.text).toBe("the first thing I want to say");
    expect(n.total).toBe(2);
    expect(n.final).toBe(false);
  });

  it("falls back to the defaults for a room nobody has edited", async () => {
    await seat();
    expect((await view(HER)).note!.text).toBe(NOTES[0]);
  });

  it("treats an empty list as going back to the defaults, not as no notes", async () => {
    await seat();
    await post("notes", { me: HIM, notes: ["mine"] });
    expect((await view(HER)).note!.text).toBe("mine");
    await post("notes", { me: HIM, notes: [] });
    expect((await view(HER)).note!.text).toBe(NOTES[0]);
  });

  it("drops blank entries rather than showing her an empty note", async () => {
    await seat();
    await post("notes", { me: HIM, notes: ["  ", "real", "", "   also real  "] });
    const n = (await view(HER)).note!;
    expect(n.total).toBe(2);
    expect(n.text).toBe("real");
  });

  it("keeps her place when he edits, and clamps rather than resetting when he trims", async () => {
    await seat(BEHIND);
    await post("notes", { me: HIM, notes: ["one", "two", "three", "four"] });
    await view(HER);
    await post("clock", { me: HIM, tz: AHEAD });
    expect((await view(HER)).note!.day).toBe(2);

    await post("notes", { me: HIM, notes: ["one", "two edited", "three", "four"] });
    expect((await view(HER)).note!.text).toBe("two edited"); // same day, new words

    await post("notes", { me: HIM, notes: ["only one left"] });
    const n = (await view(HER)).note!;
    expect(n.day).toBe(1);
    expect(n.text).toBe("only one left");
    expect(n.final).toBe(true);
  });

  it("caps how many and how long, instead of storing whatever it is sent", async () => {
    await seat();
    await post("notes", { me: HIM, notes: Array.from({ length: 200 }, (_, i) => `n${i}`) });
    expect((await view(HER)).note!.total).toBe(120);
    await post("notes", { me: HIM, notes: ["x".repeat(500)] });
    expect((await view(HER)).note!.text).toHaveLength(280);
  });

  it("rejects a body that is not a list of strings", async () => {
    await seat();
    expect((await post("notes", { me: HIM, notes: "not a list" })).status).toBe(400);
    expect((await post("notes", { me: HIM, notes: [1, 2] })).status).toBe(400);
    expect((await post("notes", { me: HIM })).status).toBe(400);
  });

  it("gives them back to him to edit, and to nobody else", async () => {
    await seat();
    await post("notes", { me: HIM, notes: ["one", "two", "three"] });
    expect((await view(HIM)).yourNotes).toEqual(["one", "two", "three"]);
    expect((await view(HER)).yourNotes).toBeNull();
    await view(STRANGER);
    expect((await view(STRANGER)).yourNotes).toBeNull();
  });

  it("does not put the unread ones in her payload at all", async () => {
    await seat();
    await post("notes", { me: HIM, notes: ["day one", "UNREAD SECOND", "UNREAD THIRD"] });
    const body = await (await SELF.fetch(`https://x/api/room/${id}?me=${HER}`)).text();
    expect(body).not.toContain("UNREAD SECOND");
    expect(body).not.toContain("UNREAD THIRD");
  });

  it("still never sends her tomorrow's words", async () => {
    await seat();
    await post("notes", { me: HIM, notes: ["today only", "SECRET FUTURE NOTE"] });
    const body = await (await SELF.fetch(`https://x/api/room/${id}?me=${HER}`)).text();
    expect(body).toContain("today only");
    expect(body).not.toContain("SECRET FUTURE NOTE");
  });
});

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
    await new Promise((resolve) => setTimeout(resolve, 2));
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
    await new Promise((resolve) => setTimeout(resolve, 2));
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
  }, 30_000);

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

describe("how long you were away", () => {
  it("has no answer on a first visit", async () => {
    expect((await view(HIM, "Aiden")).awayMs).toBeNull();
  });

  it("measures to the previous visit, not to this one", async () => {
    await view(HIM, "Aiden");
    away(30);
    const back = await view(HIM);
    expect(back.awayMs).not.toBeNull();
    expect(Math.round(back.awayMs! / 3_600_000)).toBe(30);
  });

  it("resets each time, so two visits in a row read as a short gap", async () => {
    await view(HIM, "Aiden");
    away(30);
    await view(HIM);
    const again = await view(HIM);
    expect(again.awayMs!).toBeLessThan(60_000);
  });

  it("tells a spectator nothing, since they hold no seat", async () => {
    await seat();
    expect((await view(STRANGER)).awayMs).toBeNull();
  });
});

describe("the thing she left, and what happens to it", () => {
  it("tells her he took it, once", async () => {
    await seat();
    away(72);
    await view(HER);
    expect((await view(HIM)).gift).not.toBeNull();

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

describe("putting the mug back", () => {
  // Twelve rather than the twenty-five this started at. Every round trip in here costs more than the
  // one before it (see vitest.config.ts), and a dozen draws of a one-in-three chance is already a
  // one-in-a-hundred-thousand shot at seeing only one outcome.
  it("always agrees with itself about where the mug ended up", async () => {
    await seat();
    for (let i = 0; i < 12; i++) {
      const said = (await (await post("shelf", { me: HIM })).json()) as { again: boolean };
      expect((await view(HIM)).shelfDown).toBe(said.again);
    }
  });
});

describe("a day the two of them chose", () => {
  const todayThere = (tz: string) => {
    const [m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: tz, month: "2-digit", day: "2-digit" })
      .format(new Date())
      .split("-");
    return { month: Number(m), day: Number(d) };
  };

  it("says his words back on the day, to both of them", async () => {
    await seat();
    const { month, day } = todayThere("America/New_York");
    expect((await post("ourday", { me: HIM, month, day, label: "the day we met" })).status).toBe(200);

    for (const who of [HIM, HER]) {
      const m = (await view(who)).milestone;
      expect(m?.kind).toBe("ours");
      expect(m?.label).toBe("the day we met");
    }
  });

  it("says nothing on any other day", async () => {
    await seat();
    const { month, day } = todayThere("America/New_York");
    await post("ourday", { me: HIM, month, day: (day % 28) + 1, label: "not today" });
    expect((await view(HER)).milestone).toBeNull();
  });

  it("beats the room's own anniversary when the two collide", async () => {
    await seat();
    const { month, day } = todayThere("America/New_York");
    await post("age", { me: HIM, days: 365 });
    expect((await view(HIM)).milestone?.kind).toBe("anniversary");

    await post("ourday", { me: HIM, month, day, label: "ours" });
    expect((await view(HIM)).milestone?.kind).toBe("ours");
  });

  it("is his to set, and refuses a date that does not exist", async () => {
    await seat();
    expect((await post("ourday", { me: HER, month: 1, day: 1, label: "nope" })).status).toBe(403);
    expect((await post("ourday", { me: HIM, month: 2, day: 31, label: "nope" })).status).toBe(400);
    expect((await post("ourday", { me: HIM, month: 13, day: 1, label: "nope" })).status).toBe(400);
  });

  it("is only ever echoed back to him, and clears on an empty label", async () => {
    await seat();
    const { month, day } = todayThere("America/New_York");
    await post("ourday", { me: HIM, month, day, label: "ours" });
    expect((await view(HIM)).ourDay).toEqual({ month, day, label: "ours" });
    expect((await view(HER)).ourDay).toBeNull();

    await post("ourday", { me: HIM, label: "" });
    expect((await view(HIM)).ourDay).toBeNull();
    expect((await view(HER)).milestone).toBeNull();
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

  it("leaves nothing behind but the date it went", async () => {
    await seat();
    await post("say", { me: HER, text: "something of hers" });
    await post("delete", { me: HIM, name: "Bean" });

    const stub = env.ROOM.get(env.ROOM.idFromName(id));
    await runInDurableObject(stub, async (_instance, state) => {
      const left = [...(await state.storage.list()).keys()];
      expect(left).toEqual(["deleted"]);
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
  ];
  // The one method that must answer on a dead room, because it is how the client knows it is dead.
  const ANSWERS_WHEN_GONE = ["deletedAt"];

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
});
