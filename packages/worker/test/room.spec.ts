import { SELF } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NOTES } from "../src/notes.js";
import type { Mood, RoomView } from "../src/types.js";

/**
 * The rules of the room.
 *
 * Every one of these started life as a curl command I ran by hand and then threw away, which meant
 * re-running the same checks after every change and trusting my memory of what passed. Two real bugs
 * got through that way: /dress had no seat check at all, and notes were indexed by calendar date so a
 * day she didn't visit was a note she never saw. Both have a test here now.
 *
 * The order the two people arrive in decides who they are, so every test claims seats explicitly.
 */

// UTC-12 and UTC+14: 26 hours apart, so their local dates ALWAYS differ. New York to Tokyo is only
// +13 and crosses a date boundary just some of the time, which made this pass in the evening and fail
// in the morning.
const BEHIND = "Etc/GMT+12";
const AHEAD = "Pacific/Kiritimati";

const HIM = "himhimhimhim";
const HER = "herherherher";
const STRANGER = "strangerstranger";

let room = 0;
let id = "";

/** A fresh room id per test. Durable Object state persists within a run. */
beforeEach(() => {
  id = `t${String(++room).padStart(6, "0")}`;
});

// `away()` moves the system clock, so put it back or every later test inherits the jump.
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

/** Jump the clock forward so a seat that was just used reads as long abandoned. */
function away(hours: number): void {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(Date.now() + hours * 60 * 60 * 1000));
}

/**
 * Seat both people. Pass `tz` to pin the room's clock BEFORE her first read.
 *
 * That ordering is the whole point for the note tests. Her day is recorded on whatever timezone is
 * in force when she first reads, and with no `tz` that is DEFAULT_CLOCK — America/New_York, a third
 * zone neither BEHIND nor AHEAD. For eight hours out of every day New York shares its date with
 * AHEAD rather than BEHIND, which left the rollover tests with a baseline equal to their own target,
 * unable to advance, failing only between 04:00 and 12:00 UTC.
 *
 * The zones being 26 hours apart makes them differ from *each other* always; it says nothing about
 * the one the room starts on.
 */
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

  it("rejects a timezone the runtime doesn't know", async () => {
    await seat();
    // Unvalidated, this string reaches Intl.DateTimeFormat inside the DO and takes the room down.
    expect((await post("clock", { me: HIM, tz: "Mars/Olympus" })).status).toBe(400);
    expect((await post("clock", { me: HIM, homeHour: 99 })).status).toBe(400);
    // and the room is still alive afterwards
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
    // If tomorrow's text is in the payload she can read ahead in devtools, and a gift you can skim
    // is not a gift.
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

  // Rolling her timezone forward is, to the room, the same event as tomorrow arriving.
  //
  // The zones are chosen for determinism, not realism: Etc/GMT+12 is UTC-12 and Pacific/Kiritimati is
  // UTC+14, so they are 26 hours apart and their local dates therefore ALWAYS differ. My first attempt
  // used New York to Tokyo (+13h), which crosses a date boundary only some of the time, so the test
  // passed in the evening and failed in the morning. A test that depends on when you run it is worse
  // than no test.

  it("advances by exactly one when her day rolls over", async () => {
    await seat(BEHIND);
    expect((await view(HER)).note!.day).toBe(1);

    await post("clock", { me: HIM, tz: AHEAD });
    expect((await view(HER)).note!.day).toBe(2);
    expect((await view(HER)).note!.day).toBe(2); // and holds for the rest of that day
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

/**
 * His own notes.
 *
 * Every room used to share one hardcoded array, so anybody who was not the author opened a gift full
 * of somebody else's specifics. Defaults still exist as a floor, but they are a floor.
 */
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
    // Losing three weeks of her progress because he fixed a typo would be indefensible.
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
    // He needs them to edit them. She must not have them: that is the read-ahead leak with extra steps.
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
  // The only thing in the room that accumulates. Everything else is deliberately stateless.
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

/**
 * Losing HIS phone.
 *
 * Her seat has had a path back for a while, because he can free it. His had none, so one lost phone left
 * the room permanently read-only: notes he could not edit, a cat he could not change, and no way to hand
 * the seat to a new device. This is the only way he can be restored, because there is nobody who could
 * vouch for him.
 */
describe("taking his seat back", () => {
  const NEWPHONE = "hisnewphonehis";

  it("gives the code to him and to nobody else", async () => {
    await seat();
    const code = (await view(HIM)).recoveryCode;
    expect(code).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
    expect((await view(HER)).recoveryCode).toBeNull();
    await view(STRANGER);
    expect((await view(STRANGER)).recoveryCode).toBeNull();
  });

  it("stays the same code every time he looks", async () => {
    // He has to be able to find it again while he still has the device.
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
    // And she is untouched: still the cat, still second.
    expect((await view(HER)).youAreHer).toBe(true);
  });

  it("keeps him first, so the new device is not handed the cat", async () => {
    // Arrival order decides who is who. Stamping a fresh firstSeen would make him the second seat.
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
    expect((await view(HIM)).recoveryCode).not.toBeNull(); // still his seat
  });

  it("will not let her redeem it into holding both seats", async () => {
    // If she could, the room would have one person in it and no cat.
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
    // He has not been back since she said it.
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
    expect(returned.arrivals.map((item) => item.kind === "action" ? item.action : item.kind)).toEqual([
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
    // Trimmed, and stamped, so his side can say when.
    expect(his.herLine?.text).toBe("I liked the third one");
    expect(his.herLine?.at).toBeGreaterThan(0);
  });

  it("keeps only the latest, never a history", async () => {
    // Same reasoning as the mood: a log becomes a chat, a chat has unread counts, and unread counts
    // are a thing to keep up with. The app promises there is nothing to keep up with.
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
    // The room is one private link between two people. Her line used to go to anybody who opened it,
    // while the note text was gated from the start, so privacy held in one direction only.
    await seat();
    await post("say", { me: HER, text: "come sit with me for a bit" });
    const v = await view(STRANGER);
    expect(v.herLine).toBeNull();
    // and not merely hidden by the UI: it must not be in the payload at all
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
    expect((await view(HIM)).noteDay).toBe(1); // he still gets the count
  });

  it("caps the length instead of rejecting it", async () => {
    // Rejecting a too-long note would lose what she typed. Truncating keeps it.
    await seat();
    await post("say", { me: HER, text: "x".repeat(400) });
    expect((await view(HIM)).herLine?.text).toHaveLength(140);
  });
});

/**
 * Losing a phone.
 *
 * A seat is a random localStorage token, so clearing browser data or changing device loses it. With
 * exactly two seats and no way to free one, the room would be dead forever with nobody able to be the
 * cat. This is the only recovery the app has, so it needs to work and it needs to not cost her
 * anything she has already been given.
 */
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
    expect((await view(HIM)).youAreHer).toBe(false); // he is still him
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
    // His actions survive: he never lost his seat. Hers would be entries by a person with no seat.
    expect(fresh.theirRecent.map((v) => v.action)).toEqual(["pet"]);
  });

  it("frees exactly one seat, so the room cannot end up with three people", async () => {
    await seat();
    await post("release", { me: HIM });
    await view(NEWPHONE, "Sofia again");
    // A fourth token arriving after the seat is retaken is a spectator, same as always.
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
    // seat() just visited as both, so both lastSeen are fresh.
    expect((await view(HER)).bothHereNow).toBe(true);
    expect((await view(HIM)).bothHereNow).toBe(true);
  });

  it("is never true for a spectator, who is nobody's company", async () => {
    await seat();
    expect((await view(STRANGER)).bothHereNow).toBe(false);
  });
});

describe("what she leaves him", () => {
  /**
   * Only he sees it, and it is gone once he touches anything.
   *
   * The seat gate is the point of this test rather than a nicety. This room has already shipped one
   * leak of exactly this shape (her line to him was readable by anyone holding the link), and a gift
   * is the same kind of thing: something that passes between two people and nobody else.
   */
  it("is his to find, and never hers or a stranger's", async () => {
    await seat();
    // Move the clock on instead of reaching into storage: his lastSeen stays where it was and the
    // room simply finds him long gone, which is exactly the situation being tested.
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
    // The whole meaning is "you were away". A gift waiting after a five minute gap is a notification.
    await seat();
    await view(HER);
    expect((await view(HIM)).gift).toBeNull();
  });
});

describe("the thing she knocks off the shelf", () => {
  /**
   * Either seat may put it back, and nobody else may.
   *
   * The unusual one: every other mutation here is his alone. Tidying up after the cat is not a
   * gesture performed for someone, it is just a job, and letting only him do it would make this
   * his room that she visits. A stranger with the link still cannot rearrange their furniture.
   */
  it("can be put back by either of them, and by no one else", async () => {
    await seat();
    const knock = async () => {
      // Her visit is what knocks it off, and it is a chance rather than a certainty, so keep going
      // until it lands. Bounded so a broken implementation fails the test instead of hanging.
      for (let i = 0; i < 200 && !(await view(HIM)).shelfDown; i++) await view(HER);
      expect((await view(HIM)).shelfDown).toBe(true);
    };

    await knock();
    expect((await post("shelf", { me: "strangerstranger" })).status).toBe(403);
    expect((await view(HIM)).shelfDown).toBe(true);

    expect((await post("shelf", { me: HER })).status).toBe(200);
    expect((await view(HIM)).shelfDown).toBe(false);

    await knock();
    expect((await post("shelf", { me: HIM })).status).toBe(200);
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

/*
 * What the two of them have noticed.
 *
 * The room is full of secrets that only fire if you go looking, and every one of them used to be
 * invisible to the other person: she could find all of them and he would never know. These cover the
 * ledger being shared, being seat-only, and not spoiling a secret the viewer has not found yet.
 */
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
    // The allowlist lives on the server, so an invented key cannot inflate the count.
    expect((await post("found", { me: HIM, key: "definitely-not-real" })).status).toBe(400);
    expect((await post("found", { me: HIM, key: "__proto__" })).status).toBe(400);
    expect((await view(HIM)).noticed).toBe(0);
  });

  it("ignores a stranger holding the link", async () => {
    await seat();
    expect((await post("found", { me: STRANGER, key: "piano" })).status).toBe(400);
    // What the two of them found together stays theirs.
    expect((await view(HIM)).noticed).toBe(0);
  });

  it("tells you the other one found something, without saying what", async () => {
    await seat();
    await view(HIM); // his clock starts now
    await post("found", { me: HER, key: "piano" });

    const found = (await view(HIM)).arrivals.filter((a) => a.kind === "found");
    expect(found).toHaveLength(1);
    // He has not found the piano, so naming it would hand him the answer to a thing he was going to
    // enjoy walking into.
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
    // Second read: already delivered, so the card is clean.
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
    // The client reports optimistically on every device, so a repeat is normal, not an error.
    expect((await post("found", { me: HIM, key: "piano" })).status).toBe(200);
    expect((await view(HIM)).noticed).toBe(1);
  });
});
