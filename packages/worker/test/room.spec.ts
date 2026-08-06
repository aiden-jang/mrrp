import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
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

/** He arrives first (he makes the room), then she opens the link. */
async function seat() {
  await view(HIM, "Aiden");
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
    await seat();
    await post("clock", { me: HIM, tz: BEHIND });
    expect((await view(HER)).note!.day).toBe(1);

    await post("clock", { me: HIM, tz: AHEAD });
    expect((await view(HER)).note!.day).toBe(2);
    expect((await view(HER)).note!.day).toBe(2); // and holds for the rest of that day
  });

  it("never goes backwards if her clock moves back", async () => {
    await seat();
    await post("clock", { me: HIM, tz: BEHIND });
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
    await seat();
    await post("notes", { me: HIM, notes: ["one", "two", "three", "four"] });
    await post("clock", { me: HIM, tz: BEHIND });
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
    await seat();
    await post("clock", { me: HIM, tz: "Etc/GMT+12" });
    await view(HER);
    await post("clock", { me: HIM, tz: "Pacific/Kiritimati" });
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
