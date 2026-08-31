import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { NOTES } from "../src/notes.js";
import { harness, AHEAD, BEHIND, HER, HIM, STRANGER } from "./harness.js";

const { away, id, post, seat, view } = harness("notesroom");

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
    expect((await view(HER)).note!.text).toBe("two edited");

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
    // Not in RoomView any more: they are up to 33KB and were being pushed on every write.
    const mine = async (me: string) => SELF.fetch(`https://x/api/room/${id}/notes?me=${me}`);
    expect(await (await mine(HIM)).json()).toEqual({ notes: ["one", "two", "three"] });
    expect((await mine(HER)).status).toBe(403);
    await view(STRANGER);
    expect((await mine(STRANGER)).status).toBe(403);
  });

  it("keeps his notes out of the view that gets pushed on every write", async () => {
    await seat();
    await post("notes", { me: HIM, notes: ["one", "two", "three"] });
    expect(Object.keys(await view(HIM))).not.toContain("yourNotes");
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

describe("taking a copy of the room", () => {
  const copy = async (me: string) => {
    const r = await SELF.fetch(`https://x/api/room/${id}/export?me=${me}`);
    return { status: r.status, disposition: r.headers.get("content-disposition"), body: await r.json() };
  };

  it("gives each of them their own room, named and dated", async () => {
    await seat();
    const his = await copy(HIM);
    expect(his.status).toBe(200);
    expect(his.disposition).toContain("attachment");
    expect(his.disposition).toContain(".json");

    const body = his.body as { you: string; them: string; youAreTheCat: boolean; cat: { name: string } };
    expect(body.you).toBe("Aiden");
    // His copy names her the way the room does: the name he gave her, not the placeholder her
    // record carries because she is never asked for one.
    expect(body.them).toBe(body.cat.name);
    expect(body.youAreTheCat).toBe(false);
    expect(((await copy(HER)).body as { youAreTheCat: boolean }).youAreTheCat).toBe(true);
  });

  // Tomorrow's words never reach her browser, and an export is a browser with a filename on it. It
  // would also be the easiest leak here to miss, because nobody looks at a download twice.
  it("stops her copy at the note she has actually read", async () => {
    await seat();
    await post("notes", { me: HIM, notes: ["one", "two", "three", "four"] });

    const hers = (await copy(HER)).body as { notes: string[]; notesInAll: number };
    expect(hers.notes).toEqual(["one"]);
    expect(hers.notesInAll).toBe(4);

    const his = (await copy(HIM)).body as { notes: string[] };
    expect(his.notes).toEqual(["one", "two", "three", "four"]);
  });

  it("is not a copy a stranger holding the link can take", async () => {
    await seat();
    expect((await copy(STRANGER)).status).toBe(403);
  });

  it("has nothing to give once the room is gone", async () => {
    await seat();
    await post("delete", { me: HIM, name: "Aiden" });
    expect((await copy(HIM)).status).toBe(410);
  });
});

describe("what a copy of the room actually contains", () => {
  const copy = async (me: string) =>
    (await (await SELF.fetch(`https://x/api/room/${id}/export?me=${me}`)).json()) as Record<string, unknown>;

  it("brings her own words and moods with her", async () => {
    await seat();
    await post("say", { me: HER, text: "still here" });
    await post("tell", { me: HER, mood: "good" });
    await post("act", { me: HIM, action: "brush" });

    for (const who of [HIM, HER]) {
      const mine = await copy(who);
      expect((mine.herLine as { text: string }).text).toBe("still here");
      expect((mine.moodNow as { mood: string }).mood).toBe("good");
      expect(mine.whatHeHasDone).toEqual({ brush: 1 });
      expect((mine.lately as unknown[]).length).toBeGreaterThan(0);
    }
  });

  it("tells him what she has worked out about him, and does not tell her", async () => {
    await seat();
    await post("clock", { me: HIM, tz: "UTC", homeHour: 18 });
    await post("age", { me: HIM, homingHour: 16, homingDays: 20 });

    expect((await copy(HIM)).expectsHimAt).toBeCloseTo(16, 1);
    expect((await copy(HER)).expectsHimAt).toBeNull();
  });
});
