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
  const BEHIND = "Etc/GMT+12"; // UTC-12
  const AHEAD = "Pacific/Kiritimati"; // UTC+14

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

  it("caps the length instead of rejecting it", async () => {
    // Rejecting a too-long note would lose what she typed. Truncating keeps it.
    await seat();
    await post("say", { me: HER, text: "x".repeat(400) });
    expect((await view(HIM)).herLine?.text).toHaveLength(140);
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
