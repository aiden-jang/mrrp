import { DurableObject } from "cloudflare:workers";
import type { Action, Cat, Clock, Mood, Note, RoomView, Told, Visit } from "./types.js";
import { NOTES } from "./notes.js";
import type { Env } from "./env.js";

const LOG_KEEP = 40;
/** How recently they must have been seen to count as being here now, rather than having been here. */
const HERE_NOW_MS = 3 * 60_000;
const DEFAULT_CAT: Cat = {
  name: "Sunspot",
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

  /** Do something kind. That's the entire write surface. */
  async act(me: string, action: Action): Promise<RoomView> {
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (!people[me]) return this.build(me, people); // spectators can look, not touch

    const log = (await this.ctx.storage.get<Visit[]>("log")) ?? [];
    log.unshift({ at: Date.now(), who: me, action });
    await this.ctx.storage.put("log", log.slice(0, LOG_KEEP));

    people[me].lastSeen = Date.now();
    await this.ctx.storage.put("people", people);
    return this.build(me, people);
  }

  /** Set her name and colouring once, so she can look like a cat you actually know. */
  async dress(cat: Partial<Cat>): Promise<void> {
    const current = (await this.ctx.storage.get<Cat>("cat")) ?? DEFAULT_CAT;
    await this.ctx.storage.put("cat", { ...current, ...cat });
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

    const moods = (await this.ctx.storage.get<Record<string, Told>>("moods")) ?? {};
    moods[me] = { mood, at: Date.now() };
    await this.ctx.storage.put("moods", moods);

    people[me].lastSeen = Date.now();
    await this.ctx.storage.put("people", people);
    return this.build(me, people);
  }

  /** Set whose day the room runs on. Her timezone, and roughly when she gets home. */
  async setClock(clock: Partial<Clock>): Promise<void> {
    const current = (await this.ctx.storage.get<Clock>("clock")) ?? DEFAULT_CLOCK;
    await this.ctx.storage.put("clock", { ...current, ...clock });
  }

  /**
   * Today's note, and nothing else.
   *
   * The day count starts when the second person first arrives, not when the room was made, so
   * whatever you spend fiddling with colours beforehand doesn't eat into day one. The index is
   * resolved here and only one string is returned: the browser is never sent a note she hasn't
   * earned yet, because a gift you can read ahead in isn't one.
   */
  private async noteToday(clock: Clock, bothHere: boolean): Promise<Note | null> {
    if (!bothHere || NOTES.length === 0) return null;

    let startAt = await this.ctx.storage.get<number>("startAt");
    if (startAt === undefined) {
      startAt = Date.now();
      await this.ctx.storage.put("startAt", startAt);
    }

    // Store the raw instant, not a precomputed day number. Both ends of this subtraction are then
    // converted in the same zone, so editing her timezone later shifts the day count by at most one
    // instead of skewing it permanently. Clamped below in case the clock is moved backwards.
    const elapsed = Math.max(0, localDayNumber(Date.now(), clock.tz) - localDayNumber(startAt, clock.tz));
    const i = Math.min(elapsed, NOTES.length - 1);
    return { day: i + 1, total: NOTES.length, text: NOTES[i]!, final: elapsed >= NOTES.length - 1 };
  }

  private async build(me: string, people: Record<string, Person>): Promise<RoomView> {
    const cat = (await this.ctx.storage.get<Cat>("cat")) ?? DEFAULT_CAT;
    const clock = (await this.ctx.storage.get<Clock>("clock")) ?? DEFAULT_CLOCK;
    const log = (await this.ctx.storage.get<Visit[]>("log")) ?? [];
    const moods = (await this.ctx.storage.get<Record<string, Told>>("moods")) ?? {};
    const otherId = Object.keys(people).find((id) => id !== me) ?? null;
    const them = otherId ? people[otherId]! : null;
    const waitingForThem = Object.keys(people).length < 2;
    const mine = moods[me] ?? null;

    return {
      cat,
      clock,
      myMood: mine?.mood ?? null,
      theirMood: otherId ? moods[otherId] ?? null : null,
      // Their visit has to be AFTER you spoke for it to mean anything. Comparing against lastSeen
      // rather than an explicit ack keeps this from becoming a read receipt.
      theyCameAfter: !!mine && !!them && them.lastSeen > mine.at,
      note: await this.noteToday(clock, !waitingForThem),
      you: people[me]?.name ?? null,
      them: them?.name ?? null,
      themLastAt: them?.lastSeen ?? null,
      themHereNow: !!them && Date.now() - them.lastSeen < HERE_NOW_MS,
      // Only ever surface what THEY did. Replaying your own actions back at you is just a log.
      theirRecent: otherId ? log.filter((v) => v.who === otherId).slice(0, 4) : [],
      waitingForThem,
    };
  }
}
