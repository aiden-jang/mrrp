import { DurableObject } from "cloudflare:workers";
import type { Action, Cat, Clock, Mood, Note, RoomView, Told, Told2, Visit } from "./types.js";
import { NOTES } from "./notes.js";
import type { Env } from "./env.js";

const LOG_KEEP = 40;
/** How recently they must have been seen to count as being here now, rather than having been here. */
const HERE_NOW_MS = 3 * 60_000;
// A placeholder, not the app's name. She is meant to be renamed to a cat somebody actually knows,
// via /dress, and until then she needs a name that reads well in every line of copy.
const DEFAULT_CAT: Cat = {
  name: "Bean",
  fur: "#e8963f",
  furDk: "#c9752a",
  belly: "#fbf0dd",
  eyes: "#7cb342",
  tabby: true,
};
const DEFAULT_CLOCK: Clock = { tz: "America/New_York", homeHour: 18 };

/**
 * Her calendar date in her own timezone, as days-since-epoch. Comparing these gives a day count
 * that flips over at her midnight rather than UTC's, which is the only midnight she'd notice.
 */
function localDayNumber(at: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(at));
  return Math.floor(Date.parse(`${parts}T00:00:00Z`) / 86_400_000);
}

interface Person {
  name: string;
  firstSeen: number;
  lastSeen: number;
  visits: number;
}

/**
 * One Durable Object per room, and a room is exactly two people.
 *
 * Deliberately no WebSockets and no simulation tick. The whole point is asynchronous: the two of you
 * are almost never here at the same time, so state only needs to change when somebody actually does
 * something. A fetch on page open is enough, which also means this costs close to nothing to run.
 *
 * There is also, on purpose, nothing that can go wrong for the cat. No hunger, no sadness, no streak.
 * The moment a shared pet can be neglected it becomes a chore, and a chore is the opposite of a gift.
 */
export class Room extends DurableObject<Env> {
  /** Read the room as `me` sees it, claiming a seat if one is free. */
  async view(me: string, name: string | null): Promise<RoomView> {
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    const now = Date.now();

    // Seats are claimed by whoever opens the link first and second. No accounts, no invites.
    if (!people[me] && Object.keys(people).length < 2) {
      people[me] = { name: name?.trim().slice(0, 24) || "Someone", firstSeen: now, lastSeen: now, visits: 0 };
    }
    if (people[me]) {
      people[me].lastSeen = now;
      people[me].visits += 1;
      await this.ctx.storage.put("people", people);
    }

    return this.build(me, people);
  }

  /**
   * Who is who. He makes the room and claims seat one, then sends her the link, so she is the second
   * to arrive and she is the one the cat is.
   */
  private roles(people: Record<string, Person>): { him: string | null; her: string | null } {
    const ids = Object.keys(people).sort((a, b) => people[a]!.firstSeen - people[b]!.firstSeen);
    return { him: ids[0] ?? null, her: ids[1] ?? null };
  }

  /** Do something kind, to her. Only he can: she is not here to pet herself. */
  async act(me: string, action: Action): Promise<RoomView> {
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (!people[me]) return this.build(me, people); // spectators can look, not touch
    // Enforced here, not just hidden in the UI. The buttons aren't rendered on her side, but a
    // request is a request and the seat check is the only thing that actually holds.
    if (this.roles(people).him !== me) return this.build(me, people);

    const log = (await this.ctx.storage.get<Visit[]>("log")) ?? [];
    log.unshift({ at: Date.now(), who: me, action });
    await this.ctx.storage.put("log", log.slice(0, LOG_KEEP));

    people[me].lastSeen = Date.now();
    await this.ctx.storage.put("people", people);
    return this.build(me, people);
  }

  /**
   * Set her name and colouring, so the cat can look like a cat she actually knows.
   *
   * His to set, and it is checked here rather than by hiding the form. The room link is the only
   * credential this app has, so anyone holding it could otherwise rename her cat.
   */
  async dress(me: string, cat: Partial<Cat>): Promise<boolean> {
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (this.roles(people).him !== me) return false;
    const current = (await this.ctx.storage.get<Cat>("cat")) ?? DEFAULT_CAT;
    await this.ctx.storage.put("cat", { ...current, ...cat });
    return true;
  }

  /**
   * Tell the cat how you are.
   *
   * Stored per person and overwritten, never appended. There is no history and no streak on purpose:
   * the moment this keeps a record, it stops being a way to say something and becomes a diary you can
   * fall behind on. One value, replaceable, no consequence for changing your mind.
   */
  async tell(me: string, mood: Mood): Promise<RoomView> {
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (!people[me]) return this.build(me, people); // spectators can look, not speak
    // Her mood is what the cat looks like, so only she can set it. Server-side, same reasoning.
    if (this.roles(people).her !== me) return this.build(me, people);

    const moods = (await this.ctx.storage.get<Record<string, Told>>("moods")) ?? {};
    moods[me] = { mood, at: Date.now() };
    await this.ctx.storage.put("moods", moods);

    people[me].lastSeen = Date.now();
    await this.ctx.storage.put("people", people);
    return this.build(me, people);
  }

  /**
   * Leave him a line. Hers to write, and there is only ever one.
   *
   * Replaceable, never appended: the same reasoning as the mood. A log would turn this into a chat,
   * a chat has unread counts, and unread counts are a thing to keep up with.
   */
  async say(me: string, text: string): Promise<RoomView> {
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (!people[me]) return this.build(me, people);
    if (this.roles(people).her !== me) return this.build(me, people);

    const trimmed = text.trim().slice(0, 140);
    if (trimmed) await this.ctx.storage.put<Told2>("herLine", { text: trimmed, at: Date.now() });
    else await this.ctx.storage.delete("herLine");

    people[me].lastSeen = Date.now();
    await this.ctx.storage.put("people", people);
    return this.build(me, people);
  }

  /** Set whose day the room runs on: her timezone, and when she's usually home. His to set. */
  async setClock(me: string, clock: Partial<Clock>): Promise<boolean> {
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (this.roles(people).him !== me) return false;
    const current = (await this.ctx.storage.get<Clock>("clock")) ?? DEFAULT_CLOCK;
    await this.ctx.storage.put("clock", { ...current, ...clock });
    return true;
  }

  /**
   * Today's note, and only today's.
   *
   * The index advances when SHE reads one, not by calendar date. That difference is the whole point:
   * indexing by date means a day she doesn't open the app is a note she never sees, which quietly
   * punishes exactly the behaviour the app promises not to care about. Advancing on read means she
   * gets note 2 on her second visit whether that's tomorrow or next month, and never more than one
   * a day, so she can't binge them either.
   *
   * This writes from inside build(), which makes reading the room a mutation for her seat only. Worth
   * it: the alternative is a separate "mark read" round trip that could fail after she'd seen it.
   */
  private async noteFor(clock: Clock, isHer: boolean, bothHere: boolean): Promise<Note | null> {
    if (!bothHere || NOTES.length === 0) return null;

    let idx = (await this.ctx.storage.get<number>("noteIdx")) ?? 0;

    if (isHer) {
      const today = localDayNumber(Date.now(), clock.tz);
      const lastRead = await this.ctx.storage.get<number>("noteReadDay");
      if (lastRead === undefined) {
        await this.ctx.storage.put("noteReadDay", today);
      } else if (today > lastRead) {
        idx = Math.min(idx + 1, NOTES.length - 1);
        await this.ctx.storage.put("noteIdx", idx);
        await this.ctx.storage.put("noteReadDay", today);
      }
    }

    return {
      day: idx + 1,
      total: NOTES.length,
      text: NOTES[idx]!,
      final: idx >= NOTES.length - 1,
    };
  }

  private async build(me: string, people: Record<string, Person>): Promise<RoomView> {
    const cat = (await this.ctx.storage.get<Cat>("cat")) ?? DEFAULT_CAT;
    const clock = (await this.ctx.storage.get<Clock>("clock")) ?? DEFAULT_CLOCK;
    const log = (await this.ctx.storage.get<Visit[]>("log")) ?? [];
    const moods = (await this.ctx.storage.get<Record<string, Told>>("moods")) ?? {};
    const { him, her } = this.roles(people);
    const youAreHer = !!her && me === her;
    const otherId = youAreHer ? him : her;
    const them = otherId ? people[otherId] ?? null : null;
    const waitingForThem = !her;

    // Her mood, whoever is looking, because the cat is her.
    const catTold = her ? moods[her] ?? null : null;
    const note = await this.noteFor(clock, youAreHer, !waitingForThem);

    return {
      cat,
      clock,
      youAreHer,
      catMood: catTold?.mood ?? null,
      catMoodAt: catTold?.at ?? null,
      you: people[me]?.name ?? null,
      them: them?.name ?? null,
      themLastAt: them?.lastSeen ?? null,
      themHereNow: !!them && Date.now() - them.lastSeen < HERE_NOW_MS,
      // Both of you, at once.
      //
      // Checks BOTH seats and that the viewer holds one of them. Checking only "the other person is
      // recently here" was true for a spectator as well, so a stranger who opened the link was told
      // "you're both in here right now" about two people they are not.
      bothHereNow:
        !!him &&
        !!her &&
        (me === him || me === her) &&
        Date.now() - people[him]!.lastSeen < HERE_NOW_MS &&
        Date.now() - people[her]!.lastSeen < HERE_NOW_MS,
      herLine: (await this.ctx.storage.get<Told2>("herLine")) ?? null,
      // He wrote the notes, so handing them back to him is pointless. He gets the day count only.
      note: youAreHer ? note : null,
      noteDay: youAreHer ? null : note?.day ?? null,
      // Only she sees what was done, because only he does anything.
      theirRecent: youAreHer && him ? log.filter((v) => v.who === him).slice(0, 4) : [],
      theyCameAfter: !!catTold && !!them && youAreHer && them.lastSeen > catTold.at,
      waitingForThem,
    };
  }
}
