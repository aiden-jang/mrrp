import { DurableObject } from "cloudflare:workers";
import type { Action, Cat, RoomView, Visit } from "./types.js";
import type { Env } from "./env.js";

const LOG_KEEP = 40;
const DEFAULT_CAT: Cat = {
  name: "Sunspot",
  fur: "#e8963f",
  furDk: "#c9752a",
  belly: "#fbf0dd",
  eyes: "#7cb342",
  tabby: true,
};

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

  private async build(me: string, people: Record<string, Person>): Promise<RoomView> {
    const cat = (await this.ctx.storage.get<Cat>("cat")) ?? DEFAULT_CAT;
    const log = (await this.ctx.storage.get<Visit[]>("log")) ?? [];
    const otherId = Object.keys(people).find((id) => id !== me) ?? null;
    const them = otherId ? people[otherId]! : null;

    return {
      cat,
      you: people[me]?.name ?? null,
      them: them?.name ?? null,
      themLastAt: them?.lastSeen ?? null,
      // Only ever surface what THEY did. Replaying your own actions back at you is just a log.
      theirRecent: otherId ? log.filter((v) => v.who === otherId).slice(0, 4) : [],
      waitingForThem: Object.keys(people).length < 2,
    };
  }
}
