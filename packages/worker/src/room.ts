import { isSeatToken } from "./seatToken.js";
import { DurableObject } from "cloudflare:workers";
import type {
  Action,
  CatAct,
  Arrival,
  Cat,
  Clock,
  Doodle,
  Gift,
  LeftOut,
  Treat,
  Mood,
  Note,
  RoomView,
  RoomDecor,
  Told,
  Told2,
  SaidSoFar,
  Visit,
} from "./types.js";
import { markLives, type Mark } from "./marks.js";
import { NOTES } from "./notes.js";
import { isBlanketKey, type BlanketKey } from "./blanket.js";
import { lookOutside, WEATHER_STALE_MS, type Sky, type Weather } from "./weather.js";
import { GIFTS, LINE_MAX, NOTE_MAX, NOTES_KEPT, type FirstKey } from "./types.js";
import {
  arrivalsFor,
  bothFound,
  foundCount,
  isDiscoveryKey,
  recordFound,
  type DiscoveryKey,
  type FoundLedger,
} from "./discoveries.js";
import type { Env } from "./env.js";
import { DOODLE_CELLS, widenDoodle } from "./doodle.js";
import { hourInZone, localDayNumber } from "./zone.js";
import {
  DAY_MS,
  milestoneFor,
  personalityFrom,
  homingWith,
  learnedHour,
  roomStartedAt,
  tallyFrom,
  type Homing,
  type OurDay,
  type Tally,
} from "./remembers.js";

const HER_LINES = "herLines";
const HER_DAY = "herDay";
// Keep as many answers as notes, or older replies disappear from their history.
const LINES_KEPT = 120;

const LOG_KEEP = 40;
const LEFT_KEEP = 20;
const HERE_NOW_MS = 3 * 60_000;
/* A hold is seconds. Anything older is a tab that died without its socket saying so. */
const HELD_LAPSE_MS = 30_000;
const SITTING = "sitting";
const SETTLED = "settled";
const WAITING = "waiting";
const WAITING_LAPSE_MS = 90 * 60_000;
const SITTING_LAPSE_MS = 10 * 60_000;
const POKE_LIVE_MS = 4_000;
const REACH_MS = 3_000;
const DEFAULT_CAT: Cat = {
  name: "Bean",
  fur: "#e8963f",
  furDk: "#c9752a",
  belly: "#fbf0dd",
  eyes: "#7cb342",
  tabby: true,
};
const DEFAULT_CLOCK: Clock = { tz: "America/New_York", homeHour: 18 };

/*
 * A deleted room keeps one key: the date it went. Wiping storage outright is not enough, because
 * `view()` seats whoever turns up when there are fewer than two people, so a dead link would hand a
 * stranger a brand new room.
 */
const TOMBSTONE = "deleted";

const UNDO_MS = 7 * DAY_MS;

interface Tombstone {
  at: number;
  erasesAt: number;
}

const LEFT_SIDE = "leftSide";

interface LeftSide {
  token: string;
  at: number;
  dropsAt: number;
  person: Person;
  mood?: Told;
  visits: Visit[];
  recovery?: string;
  light?: WindowLight;
  lines?: Told2[];
  doodle?: Doodle;
  blanket?: Blanket;
  gift?: Gift;
}

export const ROOM_GONE = "mrrp: room deleted";

export class RoomGone extends Error {
  constructor() {
    super(ROOM_GONE);
  }
}

const GIFT_AFTER_MS = 8 * 60 * 60 * 1000;

interface Person {
  name: string;
  firstSeen: number;
  lastSeen: number;
  visits: number;
  account?: string;
}

interface Blanket {
  key: BlanketKey;
  stripe: boolean;
}

interface Held {
  who: string;
  at: number;
}

interface Poke {
  who: string;
  what: string;
  at: number;
}

interface WindowLight {
  from: string;
  at: number;
}

export class Room extends DurableObject<Env> {
  async view(me: string, name: string | null, account?: string | null): Promise<RoomView> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    const now = Date.now();
    const bound = account ? Object.keys(people).find((t) => people[t]?.account === account) : undefined;
    if (bound && bound !== me) return this.view(bound, name);
    const lastVisit = people[me]?.lastSeen;

    const left = (await this.ctx.storage.get<string[]>("left")) ?? [];
    const iLeft = !people[me] && left.includes(me);
    if (!people[me] && !iLeft && Object.keys(people).length < 2) {
      people[me] = { name: name?.trim().slice(0, 24) || "Someone", firstSeen: now, lastSeen: now, visits: 0 };
    }
    if (people[me]) {
      people[me].lastSeen = now;
      people[me].visits += 1;
      await this.ctx.storage.put("people", people);
    }

    if (this.roles(people).him === me) {
      await this.noteHomecoming();
      if (await this.ctx.storage.get<Held>(WAITING)) await this.ctx.storage.delete(WAITING);
    }

    const handover = await this.ctx.storage.get<string>("handover");
    if (handover && handover !== me && this.roles(people).her === me) {
      await this.adoptFound(handover, me);
      await this.ctx.storage.delete("handover");
    }

    const { him: h, her: hr } = this.roles(people);
    if (hr && me === hr && h && now - (people[h]?.lastSeen ?? 0) > GIFT_AFTER_MS) {
      if (!(await this.ctx.storage.get<string>("gift"))) {
        await this.ctx.storage.put("gift", GIFTS[Math.floor(Math.random() * GIFTS.length)]!.id);
      }
    }

    void this.refreshWeather();

    const built = await this.build(me, people, lastVisit);

    // Spend it after the view is built. Before, and she is never handed the thing she just found.
    if (built.forHer && this.roles(people).her === me) {
      await this.ctx.storage.delete("forHer");
      await this.ctx.storage.put<LeftOut>("forHerTaken", { treat: built.forHer, at: Date.now() });
    }

    return built;
  }

  // Preserve `firstSeen` when moving seats; arrival order decides who is the cat.
  private roles(people: Record<string, Person>): { him: string | null; her: string | null } {
    const ids = Object.keys(people).sort((a, b) => people[a]!.firstSeen - people[b]!.firstSeen);
    return { him: ids[0] ?? null, her: ids[1] ?? null };
  }

  async act(me: string, action: Action): Promise<RoomView> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (!people[me]) return this.build(me, people);
    if (this.roles(people).him !== me) return this.build(me, people);

    if (action === "photo") {
      await this.ctx.storage.put("framed", true);
      // The frame holds one thing and a drawing beats a photo, so the photo takes it down. Record
      // whose it was, or it leaves with nothing said to the person who drew it.
      const hanging = await this.ctx.storage.get<Doodle>("doodle");
      if (hanging) {
        await this.ctx.storage.put("undrawn", { by: hanging.by, at: Date.now() });
        await this.ctx.storage.delete("doodle");
      }
    }

    if (action === "brush" || action === "sit") {
      const clock = (await this.ctx.storage.get<Clock>("clock")) ?? DEFAULT_CLOCK;
      const key = action === "brush" ? "brushedDay" : "satWithDay";
      // Keep the moment as well as the day. The day alone loses a late-night one at midnight, which is the
      // one she is most likely to have missed.
      await this.ctx.storage.put<Mark>(key, { day: localDayNumber(Date.now(), clock.tz), at: Date.now() });
    }

    const onFloor = await this.ctx.storage.get<Gift>("gift");
    if (onFloor) {
      await this.ctx.storage.put("giftKept", { gift: onFloor, at: Date.now() });
    }
    await this.ctx.storage.delete("gift");

    const previous = (await this.ctx.storage.get<Visit[]>("log")) ?? [];

    const tally = (await this.ctx.storage.get<Tally>("tally")) ?? tallyFrom(previous);
    tally[action] = (tally[action] ?? 0) + 1;
    await this.ctx.storage.put("tally", tally);

    await this.ctx.storage.put("log", [{ at: Date.now(), who: me, action }, ...previous].slice(0, LOG_KEEP));

    people[me].lastSeen = Date.now();
    await this.ctx.storage.put("people", people);
    return this.build(me, people);
  }

  // Keep her own doings out of the tally. Her personality is built from that tally, so counting them
  // would have her learning traits from herself.
  async herAct(me: string, act: CatAct): Promise<RoomView> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (!people[me]) return this.build(me, people);
    if (this.roles(people).her !== me) return this.build(me, people);

    if (act === "shelf") await this.ctx.storage.put("shelfDown", true);
    if (act === "box") {
      const clock = (await this.ctx.storage.get<Clock>("clock")) ?? DEFAULT_CLOCK;
      const today = localDayNumber(Date.now(), clock.tz);
      // Getting out is not logged, and returns before the log below.
      if (((await this.ctx.storage.get<number>("boxDay")) ?? -1) === today) {
        await this.ctx.storage.delete("boxDay");
        people[me].lastSeen = Date.now();
        await this.ctx.storage.put("people", people);
        return this.build(me, people);
      }
      if (((await this.ctx.storage.get<number>("boxOutDay")) ?? -1) !== today) {
        return this.build(me, people);
      }
      await this.ctx.storage.put("boxDay", today);
    }

    const previous = (await this.ctx.storage.get<Visit[]>("log")) ?? [];
    await this.ctx.storage.put(
      "log",
      [{ at: Date.now(), who: me, action: act }, ...previous].slice(0, LOG_KEEP),
    );

    people[me].lastSeen = Date.now();
    await this.ctx.storage.put("people", people);
    return this.build(me, people);
  }

  async poke(me: string, what: string): Promise<RoomView> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    const { him, her } = this.roles(people);
    if (me !== him && me !== her) return this.build(me, people);

    const last = await this.ctx.storage.get<Poke>("poke");
    if (last && last.who !== me && last.what === what && Date.now() - last.at < REACH_MS) {
      await this.ctx.storage.put("reach", { what, at: Date.now() });
    }
    await this.ctx.storage.put<Poke>("poke", { who: me, what, at: Date.now() });
    people[me].lastSeen = Date.now();
    await this.ctx.storage.put("people", people);
    return this.build(me, people);
  }

  async sitWith(me: string, on: boolean): Promise<RoomView> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (!people[me]) return this.build(me, people);
    if (this.roles(people).him !== me) return this.build(me, people);

    if (on) {
      await this.ctx.storage.put<Held>(SITTING, { who: me, at: Date.now() });
      return this.act(me, "sit");
    }
    await this.ctx.storage.delete(SITTING);
    await this.ctx.storage.delete(SETTLED);
    people[me].lastSeen = Date.now();
    await this.ctx.storage.put("people", people);
    return this.build(me, people);
  }

  async settle(me: string, on: boolean): Promise<RoomView> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (!people[me]) return this.build(me, people);
    if (this.roles(people).her !== me) return this.build(me, people);

    const sitting = await this.ctx.storage.get<Held>(SITTING);
    const sat = !!sitting && Date.now() - sitting.at < SITTING_LAPSE_MS;
    if (on && sat) {
      await this.ctx.storage.put<Held>(SETTLED, { who: me, at: Date.now() });
      await this.noteFirst("settled");
    } else await this.ctx.storage.delete(SETTLED);

    people[me].lastSeen = Date.now();
    await this.ctx.storage.put("people", people);
    return this.build(me, people);
  }

  async waitAtDoor(me: string, on: boolean): Promise<RoomView> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (!people[me]) return this.build(me, people);
    if (this.roles(people).her !== me) return this.build(me, people);

    if (on) await this.ctx.storage.put<Held>(WAITING, { who: me, at: Date.now() });
    else await this.ctx.storage.delete(WAITING);
    people[me].lastSeen = Date.now();
    await this.ctx.storage.put("people", people);
    return this.build(me, people);
  }

  async hold(me: string, on: boolean): Promise<RoomView> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (!people[me]) return this.build(me, people);
    if (this.roles(people).him !== me) return this.build(me, people);

    if (on) {
      await this.ctx.storage.put<Held>("held", { who: me, at: Date.now() });
      if (this.hereNow(people, this.roles(people).her ?? "")) await this.noteFirst("held");
    } else await this.ctx.storage.delete("held");
    people[me].lastSeen = Date.now();
    await this.ctx.storage.put("people", people);
    return this.build(me, people);
  }

  // The door screen asks before it seats anybody, so it cannot call `view()` to find out: on a live
  // room that would take the seat it exists to ask about.
  async alive(): Promise<{ ok: true }> {
    await this.guard();
    return { ok: true };
  }

  async putBoxOut(me: string, on = true): Promise<RoomView> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (!people[me]) return this.build(me, people);
    if (this.roles(people).him !== me) return this.build(me, people);

    const clock = (await this.ctx.storage.get<Clock>("clock")) ?? DEFAULT_CLOCK;
    const today = localDayNumber(Date.now(), clock.tz);
    if (!on) {
      if (((await this.ctx.storage.get<number>("boxDay")) ?? -1) === today) {
        return this.build(me, people);
      }
      await this.ctx.storage.delete("boxOutDay");
      people[me].lastSeen = Date.now();
      await this.ctx.storage.put("people", people);
      return this.build(me, people);
    }
    await this.ctx.storage.put("boxOutDay", today);
    const previous = (await this.ctx.storage.get<Visit[]>("log")) ?? [];
    await this.ctx.storage.put(
      "log",
      [{ at: Date.now(), who: me, action: "boxout" as const }, ...previous].slice(0, LOG_KEEP),
    );
    people[me].lastSeen = Date.now();
    await this.ctx.storage.put("people", people);
    return this.build(me, people);
  }

  async leaveOut(me: string, treat: Treat): Promise<RoomView> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (!people[me]) return this.build(me, people);
    if (this.roles(people).him !== me) return this.build(me, people);

    await this.ctx.storage.put<LeftOut>("forHer", { treat, at: Date.now() });
    const previous = (await this.ctx.storage.get<Visit[]>("log")) ?? [];
    await this.ctx.storage.put(
      "log",
      [{ at: Date.now(), who: me, action: "leaveout" as const }, ...previous].slice(0, LOG_KEEP),
    );
    people[me].lastSeen = Date.now();
    await this.ctx.storage.put("people", people);
    return this.build(me, people);
  }

  async leaveGift(me: string, gift: Gift, text = ""): Promise<RoomView> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (!people[me]) return this.build(me, people);
    if (this.roles(people).her !== me) return this.build(me, people);

    await this.ctx.storage.put("gift", gift);
    // One stamp for both. His card drops the generic gift arrival when a line carries the same gift at
    // the same moment, and two `Date.now()` calls either side of an await can land apart.
    const now = Date.now();
    const said = text.trim().slice(0, LINE_MAX);
    if (said) await this.keepLine({ text: said, at: now, gift });
    const previous = (await this.ctx.storage.get<Visit[]>("log")) ?? [];
    await this.ctx.storage.put(
      "log",
      [{ at: now, who: me, action: "gift" as const }, ...previous].slice(0, LOG_KEEP),
    );
    people[me].lastSeen = now;
    await this.ctx.storage.put("people", people);
    return this.build(me, people);
  }

  async putBack(me: string): Promise<false | "tidy" | "again"> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    const { him, her } = this.roles(people);
    if (me !== him && me !== her) return false;
    await this.ctx.storage.put("shelfDown", false);

    const again = Math.random() < 1 / 3;
    if (again) await this.ctx.storage.put("shelfDown", true);
    return again ? "again" : "tidy";
  }

  async touchWindowLight(me: string): Promise<RoomView | null> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    const { him, her } = this.roles(people);
    if (me !== him && me !== her) return null;

    const current = await this.ctx.storage.get<WindowLight>("windowLight");
    if (current && current.from !== me) await this.ctx.storage.delete("windowLight");
    else await this.ctx.storage.put<WindowLight>("windowLight", { from: me, at: Date.now() });

    people[me]!.lastSeen = Date.now();
    await this.ctx.storage.put("people", people);
    return this.build(me, people);
  }

  async dress(me: string, cat: Partial<Cat>, decor?: RoomDecor): Promise<boolean> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (this.roles(people).him !== me) return false;
    const current = (await this.ctx.storage.get<Cat>("cat")) ?? DEFAULT_CAT;
    // Omitted dress fields must not wipe her existing colors.
    const given = Object.fromEntries(Object.entries(cat).filter(([, v]) => v !== undefined));
    await this.ctx.storage.put("cat", { ...current, ...given });
    if (decor) await this.ctx.storage.put("decor", decor);
    return true;
  }

  // Plaintext on purpose. All this can do is become one seat of one room, and anybody who can read
  // this storage already has the room, the notes and both names.
  private async recoveryCode(seat: "him" | "her"): Promise<string> {
    const key = seat === "him" ? "recovery" : "recoveryHer";
    const existing = await this.ctx.storage.get<string>(key);
    if (existing) return existing;
    const A = "abcdefghijkmnpqrstuvwxyz23456789";
    const raw = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => A[b % A.length]).join("");
    const code = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
    await this.ctx.storage.put(key, code);
    return code;
  }

  async recoverSeat(me: string, code: string): Promise<boolean> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    const { him, her } = this.roles(people);
    const given = code.trim().toLowerCase();
    if (!given) return false;

    const hisCode = him ? await this.ctx.storage.get<string>("recovery") : null;
    const herCode = her ? await this.ctx.storage.get<string>("recoveryHer") : null;
    const seat = hisCode && given === hisCode ? "him" : herCode && given === herCode ? "her" : null;
    if (!seat) return false;

    const taking = seat === "him" ? him! : her!;
    if (me === (seat === "him" ? her : him)) return false;
    if (me === taking) return true;

    const old = people[taking]!;
    delete people[taking];
    people[me] = { ...old, lastSeen: Date.now() };
    await this.ctx.storage.put("people", people);
    await this.reseatBelongings(taking, me);
    return true;
  }

  private async adoptFound(from: string, to: string): Promise<void> {
    const found = await this.found();
    let moved = false;
    const next: FoundLedger = Object.create(null);
    for (const [key, seats] of Object.entries(found)) {
      const copy = { ...seats };
      if (copy[from] !== undefined) {
        copy[to] = copy[from]!;
        delete copy[from];
        moved = true;
      }
      next[key] = copy;
    }
    if (moved) await this.ctx.storage.put("found", next);
  }

  private async reseatBelongings(from: string, to: string): Promise<void> {
    const light = await this.ctx.storage.get<WindowLight>("windowLight");
    if (light?.from === from) await this.ctx.storage.put("windowLight", { ...light, from: to });

    const moods = (await this.ctx.storage.get<Record<string, Told>>("moods")) ?? {};
    if (moods[from]) {
      moods[to] = moods[from]!;
      delete moods[from];
      await this.ctx.storage.put("moods", moods);
    }

    const log = (await this.ctx.storage.get<Visit[]>("log")) ?? [];
    if (log.some((v) => v.who === from)) {
      await this.ctx.storage.put(
        "log",
        log.map((v) => (v.who === from ? { ...v, who: to } : v)),
      );
    }

    const found = await this.found();
    let moved = false;
    const next: FoundLedger = Object.create(null);
    for (const [key, seats] of Object.entries(found)) {
      const copy = { ...seats };
      if (copy[from] !== undefined) {
        copy[to] = copy[from]!;
        delete copy[from];
        moved = true;
      }
      next[key] = copy;
    }
    if (moved) await this.ctx.storage.put("found", next);
  }

  async linkAccount(me: string, account: string, on: boolean): Promise<boolean> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    const { him, her } = this.roles(people);
    if (me !== him && me !== her) return false;

    if (on) {
      const taken = Object.entries(people).find(([token, p]) => p.account === account && token !== me);
      if (taken) return false;
      people[me]!.account = account;
    } else {
      if (people[me]!.account !== account) return false;
      delete people[me]!.account;
    }
    await this.ctx.storage.put("people", people);
    return true;
  }

  private async found(): Promise<FoundLedger> {
    return (await this.ctx.storage.get<FoundLedger>("found")) ?? {};
  }

  async noticed(me: string, key: unknown): Promise<boolean> {
    await this.guard();
    if (!isDiscoveryKey(key)) return false;
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    const { him, her } = this.roles(people);
    if (me !== him && me !== her) return false;

    if (key === "belly" && !this.bothHere(people)) return false;

    const before = await this.found();
    const { ledger, isNew } = recordFound(before, key as DiscoveryKey, me, Date.now());
    if (isNew) await this.ctx.storage.put("found", ledger);
    return true;
  }

  // Keep these out of RoomView. Up to 33KB, and the room pushes a view on every single write.
  async notesFor(me: string): Promise<string[] | null> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (this.roles(people).him !== me) return null;
    return this.notes();
  }

  async saidSoFar(me: string): Promise<SaidSoFar | null> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    const { him, her } = this.roles(people);
    if (me !== him && me !== her) return null;

    const all = await this.notes();
    const read = Math.min((await this.ctx.storage.get<number>("noteIdx")) ?? 0, all.length - 1);
    const lines = await this.lines();

    // Only if the note still says what it said when she answered. Otherwise he has rewritten it, and her
    // words would end up attached to a sentence she never read.
    const home = (line: Told2) =>
      line.aboutDay !== undefined && all[line.aboutDay] === line.about ? line.aboutDay : null;

    const answers = new Map<number, Told2[]>();
    for (const line of lines) {
      const day = home(line);
      if (day === null) continue;
      answers.set(day, [...(answers.get(day) ?? []), line]);
    }

    return {
      total: all.length,
      notes: all.slice(0, read + 1).map((text, i) => ({
        day: i + 1,
        text,
        answers: (answers.get(i) ?? []).map((a) => ({ text: a.text, at: a.at })),
      })),
      lines: lines
        .filter((line) => home(line) === null)
        .map((line) => ({ text: line.text, at: line.at, gift: line.gift, about: line.about })),
    };
  }

  private async notes(): Promise<string[]> {
    const own = await this.ctx.storage.get<string[]>("notes");
    return own && own.length > 0 ? own : NOTES;
  }

  async setNotes(me: string, notes: string[]): Promise<boolean> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (this.roles(people).him !== me) return false;

    const clean = notes
      .map((n) => n.trim().slice(0, NOTE_MAX))
      .filter(Boolean)
      .slice(0, NOTES_KEPT);
    if (clean.length === 0) {
      await this.ctx.storage.delete("notes");
    } else {
      await this.ctx.storage.put("notes", clean);
      const idx = (await this.ctx.storage.get<number>("noteIdx")) ?? 0;
      if (idx > clean.length - 1) await this.ctx.storage.put("noteIdx", clean.length - 1);
    }
    return true;
  }

  // A first that can happen twice is not a first, so this only ever writes a key that is missing.
  private async noteFirst(what: FirstKey): Promise<void> {
    if (await this.ctx.storage.get<Tombstone>(TOMBSTONE)) return;
    const firsts = (await this.ctx.storage.get<Record<string, number>>("firsts")) ?? {};
    if (firsts[what]) return;
    firsts[what] = Date.now();
    await this.ctx.storage.put("firsts", firsts);
  }

  // Runs behind the response, never in front of it. The stamp is written before the request, so a
  // service that is down is asked every half hour rather than on every single view.
  private async refreshWeather(): Promise<void> {
    const current = await this.ctx.storage.get<Weather>("weather");
    if (current && Date.now() - current.at < WEATHER_STALE_MS) return;
    const at = Date.now();
    await this.ctx.storage.put<Weather>("weather", { sky: current?.sky ?? "clear", at });

    const clock = (await this.ctx.storage.get<Clock>("clock")) ?? DEFAULT_CLOCK;
    this.ctx.waitUntil(
      lookOutside(clock.tz, this.env.WEATHER_URL).then(async (sky) => {
        if (!sky) return;
        if (await this.ctx.storage.get<Tombstone>(TOMBSTONE)) return;
        await this.ctx.storage.put<Weather>("weather", { sky, at });
        if (sky === "snow" || sky === "rain") await this.noteFirst(sky);
      }),
    );
  }

  private async noteHomecoming(): Promise<void> {
    const clock = (await this.ctx.storage.get<Clock>("clock")) ?? DEFAULT_CLOCK;
    const now = Date.now();
    const day = localDayNumber(now, clock.tz);
    const previous = (await this.ctx.storage.get<Homing>("homing")) ?? null;
    if (previous?.lastDay === day) return;

    const hour = hourInZone(now, clock.tz);
    const next = homingWith(previous, hour, day);
    if (next) await this.ctx.storage.put<Homing>("homing", next);
  }

  private bothHere(people: Record<string, Person>): boolean {
    const { him, her } = this.roles(people);
    if (!him || !her) return false;
    return this.hereNow(people, him) && this.hereNow(people, her);
  }

  private hereNow(people: Record<string, Person>, token: string): boolean {
    if (this.liveTokens().has(token)) return true;
    return Date.now() - (people[token]?.lastSeen ?? 0) < HERE_NOW_MS;
  }

  // On the socket, not in a Map: hibernation throws memory away and the socket comes back.
  private tokenOf(ws: WebSocket): string | null {
    try {
      const held = ws.deserializeAttachment() as { me?: string } | null;
      return held?.me ?? null;
    } catch {
      return null;
    }
  }

  private liveTokens(): Set<string> {
    const out = new Set<string>();
    for (const ws of this.ctx.getWebSockets()) {
      const me = this.tokenOf(ws);
      if (me) out.add(me);
    }
    return out;
  }

  // One view per socket, and `build`, not `view`. Each seat gets different answers, so one shared
  // payload would hand each of them the other's.
  // Guard first, or a deleted room pushes a view of an empty room to whatever tabs are still open
  // and a dead link becomes a fresh room again.
  private async broadcast(): Promise<void> {
    const sockets = this.ctx.getWebSockets();
    if (sockets.length === 0) return;
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    for (const ws of sockets) {
      const me = this.tokenOf(ws);
      if (!me) continue;
      try {
        ws.send(JSON.stringify({ type: "view", view: await this.build(me, people) }));
      } catch {
        // A socket that died between the list and the send. webSocketClose cleans it up.
      }
    }
  }

  async notify(): Promise<void> {
    try {
      await this.guard();
    } catch (e) {
      for (const ws of this.ctx.getWebSockets()) {
        try {
          ws.send(JSON.stringify({ type: "gone" }));
          ws.close(1001, "gone");
        } catch {
          // Already closed.
        }
      }
      throw e;
    }

    // Don't coalesce these. It was tried: it needs timing state on an object that hibernates, and every
    // way it fails is the room going quiet. DECISIONS.md has the numbers.
    await this.broadcast();
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }
    const me = new URL(request.url).searchParams.get("me") ?? "";
    if (!isSeatToken(me)) return new Response("bad seat", { status: 400 });
    try {
      await this.guard();
    } catch {
      return new Response("gone", { status: 410 });
    }

    // Require seat credentials for sockets: message timing reveals presence even without names.
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (!people[me]) return new Response("not your seat", { status: 403 });

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    server.serializeAttachment({ me });
    // Hibernatable, never `server.accept()`: that holds the object in memory all day.
    this.ctx.acceptWebSocket(server);

    await this.broadcast();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    // The only thing a client may say. A socket that could write would be a way past the seat checks.
    if (typeof message === "string" && message === "ping") ws.send("pong");
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const me = this.tokenOf(ws);
    try {
      ws.close();
    } catch {
      // Already closed.
    }
    // He closed the tab mid-hold, or mid-sit. Without this she watches a hand that is not there until it
    // lapses, or sits with somebody who has gone.
    const held = await this.ctx.storage.get<Held>("held");
    if (me && held?.who === me) await this.ctx.storage.delete("held");
    const sitting = await this.ctx.storage.get<Held>(SITTING);
    if (me && sitting?.who === me) {
      await this.ctx.storage.delete(SITTING);
      await this.ctx.storage.delete(SETTLED);
    }
    await this.broadcast();
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }

  // Every method a route can reach must call this first, or a dead link hands a stranger a fresh room.
  // A test walks the prototype and fails on any method that does not.
  private async guard(): Promise<void> {
    const stone = await this.ctx.storage.get<Tombstone>(TOMBSTONE);
    if (!stone) return;
    if (Date.now() >= stone.erasesAt) await this.erase(stone);
    throw new RoomGone();
  }

  async undoUntil(me: string): Promise<number | null> {
    const stone = await this.ctx.storage.get<Tombstone>(TOMBSTONE);
    if (!stone || Date.now() >= stone.erasesAt) return null;
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    return this.roles(people).him === me ? stone.erasesAt : null;
  }

  async undelete(me: string): Promise<boolean> {
    if (!(await this.undoUntil(me))) return false;
    await this.ctx.storage.delete(TOMBSTONE);
    await this.scheduleNext();
    return true;
  }

  async alarm(): Promise<void> {
    const stone = await this.ctx.storage.get<Tombstone>(TOMBSTONE);
    if (stone && Date.now() >= stone.erasesAt) {
      await this.erase(stone);
      return;
    }
    await this.sweepLeftSide();
    await this.scheduleNext();
  }

  private async erase(stone: Tombstone): Promise<void> {
    await this.ctx.storage.deleteAll();
    await this.ctx.storage.put<Tombstone>(TOMBSTONE, stone);
  }

  async deleteRoom(me: string, typed: string): Promise<number | false> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (this.roles(people).him !== me) return false;
    // His own name, never hers. She is the cat, so asking for her name here would be asking him to type
    // her out of the room.
    const signature = people[me]?.name ?? "";
    if (!signature || typed.trim().toLowerCase() !== signature.trim().toLowerCase()) return false;

    const at = Date.now();
    const erasesAt = at + UNDO_MS;
    await this.ctx.storage.put<Tombstone>(TOMBSTONE, { at, erasesAt });
    await this.scheduleNext();
    return erasesAt;
  }

  async leaveRoom(me: string): Promise<boolean> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (this.roles(people).her !== me) return false;
    await this.wipeHerSide(people, true);
    return true;
  }

  async releaseHerSeat(me: string): Promise<boolean> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    const { him, her } = this.roles(people);
    if (him !== me || !her) return false;
    await this.wipeHerSide(people, false);
    return true;
  }

  // `bar` is what separates her leaving from him freeing her seat. Leaving has to stop this browser
  // being reseated by its own next page load, or leaving undoes itself.
  private async wipeHerSide(people: Record<string, Person>, bar: boolean): Promise<void> {
    const her = this.roles(people).her;
    if (!her) return;

    const moods = (await this.ctx.storage.get<Record<string, Told>>("moods")) ?? {};
    const log = (await this.ctx.storage.get<Visit[]>("log")) ?? [];
    const light = await this.ctx.storage.get<WindowLight>("windowLight");
    const recovery = await this.ctx.storage.get<string>("recoveryHer");
    const lines = await this.lines();
    const doodle = await this.ctx.storage.get<Doodle>("doodle");
    const blanket = await this.ctx.storage.get<Blanket>("blanket");
    const gift = await this.ctx.storage.get<Gift>("gift");

    if (bar) {
      const at = Date.now();
      await this.ctx.storage.put<LeftSide>(LEFT_SIDE, {
        token: her,
        at,
        dropsAt: at + UNDO_MS,
        person: people[her]!,
        mood: moods[her],
        visits: log.filter((v) => v.who === her),
        recovery,
        light: light?.from === her ? light : undefined,
        lines,
        doodle: doodle?.by === her ? doodle : undefined,
        blanket: blanket ?? undefined,
        gift: gift ?? undefined,
      });
    }

    delete moods[her];
    delete people[her];
    await this.ctx.storage.put("people", people);
    await this.ctx.storage.put("moods", moods);
    await this.ctx.storage.put(
      "log",
      log.filter((v) => v.who !== her),
    );
    if (light?.from === her) await this.ctx.storage.delete("windowLight");
    if (bar) {
      await this.ctx.storage.delete(HER_LINES);
      await this.ctx.storage.delete("herLine");
      // It goes only if she is the one who put it there. He can draw in that frame too, and his picture is
      // not hers to take.
      if (doodle?.by === her) await this.ctx.storage.delete("doodle");
      await this.ctx.storage.delete("blanket");
      await this.ctx.storage.delete("gift");
    }
    await this.ctx.storage.delete("recoveryHer");
    if (!bar) await this.ctx.storage.put("handover", her);

    if (bar) {
      const left = (await this.ctx.storage.get<string[]>("left")) ?? [];
      await this.ctx.storage.put("left", [her, ...left.filter((t) => t !== her)].slice(0, LEFT_KEEP));
      await this.scheduleNext();
    }
  }

  async undoLeaveUntil(me: string): Promise<number | null> {
    await this.guard();
    const kept = await this.sweepLeftSide();
    if (!kept || kept.token !== me) return null;
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    return this.roles(people).her ? null : kept.dropsAt;
  }

  async unleave(me: string): Promise<boolean> {
    await this.guard();
    if (!(await this.undoLeaveUntil(me))) return false;
    const kept = (await this.ctx.storage.get<LeftSide>(LEFT_SIDE))!;

    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    people[kept.token] = kept.person;
    await this.ctx.storage.put("people", people);

    if (kept.mood) {
      const moods = (await this.ctx.storage.get<Record<string, Told>>("moods")) ?? {};
      moods[kept.token] = kept.mood;
      await this.ctx.storage.put("moods", moods);
    }
    if (kept.visits.length > 0) {
      const log = (await this.ctx.storage.get<Visit[]>("log")) ?? [];
      const merged = [...log, ...kept.visits].sort((a, b) => b.at - a.at).slice(0, LOG_KEEP);
      await this.ctx.storage.put("log", merged);
    }
    if (kept.lines && kept.lines.length > 0) await this.ctx.storage.put(HER_LINES, kept.lines);
    if (kept.doodle) await this.ctx.storage.put("doodle", kept.doodle);
    if (kept.blanket) await this.ctx.storage.put("blanket", kept.blanket);
    if (kept.gift) await this.ctx.storage.put("gift", kept.gift);
    if (kept.recovery) await this.ctx.storage.put("recoveryHer", kept.recovery);
    if (kept.light) await this.ctx.storage.put("windowLight", kept.light);

    if ((await this.ctx.storage.get<string>("handover")) === kept.token) {
      await this.ctx.storage.delete("handover");
    }

    const left = (await this.ctx.storage.get<string[]>("left")) ?? [];
    await this.ctx.storage.put(
      "left",
      left.filter((t) => t !== kept.token),
    );
    await this.ctx.storage.delete(LEFT_SIDE);
    await this.scheduleNext();
    return true;
  }

  private async sweepLeftSide(): Promise<LeftSide | null> {
    const kept = await this.ctx.storage.get<LeftSide>(LEFT_SIDE);
    if (!kept) return null;
    if (Date.now() < kept.dropsAt) return kept;
    await this.ctx.storage.delete(LEFT_SIDE);
    return null;
  }

  private async scheduleNext(): Promise<void> {
    const stone = await this.ctx.storage.get<Tombstone>(TOMBSTONE);
    const kept = await this.ctx.storage.get<LeftSide>(LEFT_SIDE);
    const due = [stone?.erasesAt, kept?.dropsAt].filter((t): t is number => typeof t === "number");
    if (due.length === 0) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(Math.min(...due));
  }

  async setBlanket(me: string, key: unknown, stripe: unknown): Promise<boolean> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (this.roles(people).her !== me) return false;
    if (!isBlanketKey(key)) return false;
    await this.ctx.storage.put<Blanket>("blanket", { key, stripe: stripe === true });
    return true;
  }

  async exportFor(me: string): Promise<Record<string, unknown> | null> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    const { him, her } = this.roles(people);
    if (me !== him && me !== her) return null;

    const youAreHer = me === her;
    const clock = (await this.ctx.storage.get<Clock>("clock")) ?? DEFAULT_CLOCK;
    const notes = await this.notes();
    const readSoFar = Math.min((await this.ctx.storage.get<number>("noteIdx")) ?? 0, notes.length - 1);
    const cat = (await this.ctx.storage.get<Cat>("cat")) ?? DEFAULT_CAT;
    const nameOf = (token: string | null): string | null =>
      token && token === her ? cat.name : token ? (people[token]?.name ?? null) : null;

    return {
      takenAt: new Date().toISOString(),
      you: nameOf(me),
      them: nameOf(youAreHer ? him : her),
      youAreTheCat: youAreHer,
      startedAt: new Date(
        roomStartedAt(
          Object.values(people).map((person) => person.firstSeen),
          Date.now(),
        ),
      ).toISOString(),
      cat,
      decor: await this.ctx.storage.get<RoomDecor>("decor"),
      clock,
      blanket: (await this.ctx.storage.get<Blanket>("blanket")) ?? null,
      // The day you named, never theirs. A copy of the room must not be a way round the surprise.
      ourDay: (await this.ctx.storage.get<OurDay>(youAreHer ? HER_DAY : "ourDay")) ?? null,
      drawing: ((c) => (c ? widenDoodle(c) : null))((await this.ctx.storage.get<Doodle>("doodle"))?.cells),
      notes: youAreHer ? notes.slice(0, readSoFar + 1) : notes,
      notesInAll: notes.length,
      found: Object.keys(await this.found()),
      herLines: await this.lines(),
      moodNow: (await this.ctx.storage.get<Record<string, Told>>("moods"))?.[her ?? ""] ?? null,
      whatHeHasDone: (await this.ctx.storage.get<Tally>("tally")) ?? {},
      lately: (await this.ctx.storage.get<Visit[]>("log")) ?? [],
      expectsHimAt: youAreHer
        ? null
        : learnedHour((await this.ctx.storage.get<Homing>("homing")) ?? null, clock.homeHour),
      visits: Object.fromEntries(
        Object.entries(people).map(([token, person]) => [
          token === me ? "you" : "them",
          { name: nameOf(token), since: new Date(person.firstSeen).toISOString(), times: person.visits },
        ]),
      ),
    };
  }

  async tell(me: string, mood: Mood): Promise<RoomView> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (!people[me]) return this.build(me, people);
    if (this.roles(people).her !== me) return this.build(me, people);

    const moods = (await this.ctx.storage.get<Record<string, Told>>("moods")) ?? {};
    moods[me] = { mood, at: Date.now() };
    await this.ctx.storage.put("moods", moods);

    people[me].lastSeen = Date.now();
    await this.ctx.storage.put("people", people);
    return this.build(me, people);
  }

  async say(me: string, text: string, aboutDay?: number): Promise<RoomView> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (!people[me]) return this.build(me, people);
    if (this.roles(people).her !== me) return this.build(me, people);

    // She can only answer a note the room has actually handed her. The button is only ever on one she has
    // read, but the button is not the rule.
    const read = (await this.ctx.storage.get<number>("noteIdx")) ?? 0;
    const day = aboutDay !== undefined && aboutDay <= read ? aboutDay : undefined;
    // Keep what the note said, not just where it sat. He can rewrite his notes whenever he likes.
    const about = day === undefined ? undefined : (await this.notes())[day];

    const trimmed = text.trim().slice(0, LINE_MAX);
    if (trimmed) await this.keepLine({ text: trimmed, at: Date.now(), aboutDay: day, about });
    else {
      await this.ctx.storage.delete(HER_LINES);
      await this.ctx.storage.delete("herLine");
    }

    people[me].lastSeen = Date.now();
    await this.ctx.storage.put("people", people);
    return this.build(me, people);
  }

  // Her lines, newest first. Don't move the old single-line key to a write-side migration: a room
  // nobody opens is a room nobody writes to, so her line would vanish from every untouched room.
  private async lines(): Promise<Told2[]> {
    const kept = await this.ctx.storage.get<Told2[]>(HER_LINES);
    if (kept) return kept;
    const old = await this.ctx.storage.get<Told2>("herLine");
    return old ? [old] : [];
  }

  // One line, not all of them. Emptying the box wipes the lot, which made the 2am sentence she
  // regretted cost her every other thing she had ever said.
  async unsay(me: string, at: number): Promise<RoomView> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (!people[me]) return this.build(me, people);
    if (this.roles(people).her !== me) return this.build(me, people);

    const kept = (await this.lines()).filter((line) => line.at !== at);
    if (kept.length > 0) await this.ctx.storage.put(HER_LINES, kept);
    else {
      await this.ctx.storage.delete(HER_LINES);
      await this.ctx.storage.delete("herLine");
    }
    people[me].lastSeen = Date.now();
    await this.ctx.storage.put("people", people);
    return this.build(me, people);
  }

  private async keepLine(line: Told2): Promise<void> {
    await this.ctx.storage.put(HER_LINES, [line, ...(await this.lines())].slice(0, LINES_KEPT));
  }

  async draw(me: string, cells: string): Promise<RoomView> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (!people[me]) return this.build(me, people);
    const { him, her } = this.roles(people);
    if (me !== him && me !== her) return this.build(me, people);
    if (cells.length !== DOODLE_CELLS || !/^[0-4]+$/.test(cells)) return this.build(me, people);

    if (/[1-4]/.test(cells)) await this.ctx.storage.put<Doodle>("doodle", { cells, by: me, at: Date.now() });
    else await this.ctx.storage.delete("doodle");

    people[me].lastSeen = Date.now();
    await this.ctx.storage.put("people", people);
    return this.build(me, people);
  }

  async age(
    me: string,
    want: { days?: number; tally?: Tally; noteIdx?: number; awayHours?: number; homing?: Homing },
  ): Promise<RoomView> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    const { him, her } = this.roles(people);
    if (me !== him && me !== her) return this.build(me, people);

    if (want.days !== undefined) {
      const start = Date.now() - Math.max(0, want.days) * DAY_MS;
      for (const person of Object.values(people)) person.firstSeen = start;
      await this.ctx.storage.put("people", people);
    }
    if (want.awayHours !== undefined && people[me]) {
      people[me].lastSeen = Date.now() - Math.max(0, want.awayHours) * 60 * 60 * 1000;
      await this.ctx.storage.put("people", people);
    }
    if (want.tally) await this.ctx.storage.put("tally", want.tally);
    if (want.homing) {
      const clock = (await this.ctx.storage.get<Clock>("clock")) ?? DEFAULT_CLOCK;
      await this.ctx.storage.put<Homing>("homing", {
        ...want.homing,
        lastDay: localDayNumber(Date.now(), clock.tz),
      });
    }
    if (want.noteIdx !== undefined) {
      const clock = (await this.ctx.storage.get<Clock>("clock")) ?? DEFAULT_CLOCK;
      await this.ctx.storage.put("noteIdx", Math.max(0, want.noteIdx));
      await this.ctx.storage.put("noteReadDay", localDayNumber(Date.now(), clock.tz));
    }
    return this.build(me, people);
  }

  // Each seat owns a private date; the other seat learns of it through the room on that day.
  async setOurDay(me: string, day: OurDay | null): Promise<boolean> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    const { him, her } = this.roles(people);
    if (me !== him && me !== her) return false;
    const key = me === him ? "ourDay" : HER_DAY;
    if (day) await this.ctx.storage.put(key, day);
    else await this.ctx.storage.delete(key);
    return true;
  }

  async setClock(me: string, clock: Partial<Clock>): Promise<boolean> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (this.roles(people).him !== me) return false;
    const current = (await this.ctx.storage.get<Clock>("clock")) ?? DEFAULT_CLOCK;
    await this.ctx.storage.put("clock", { ...current, ...clock });

    // Key the cache on her timezone. He opens the room before picking one, so the first lookup is always
    // for the default and the very next thing he does changes it.
    if (clock.tz !== undefined && clock.tz !== current.tz) await this.ctx.storage.delete("weather");
    return true;
  }

  private async doodleFor(me: string, seated: boolean): Promise<RoomView["doodle"]> {
    if (!seated) return null;
    const d = await this.ctx.storage.get<Doodle>("doodle");
    return d ? { cells: widenDoodle(d.cells), mine: d.by === me, at: d.at } : null;
  }

  private async noteFor(clock: Clock, isHer: boolean, bothHere: boolean): Promise<Note | null> {
    const notes = await this.notes();
    if (!bothHere || notes.length === 0) return null;

    let idx = Math.min((await this.ctx.storage.get<number>("noteIdx")) ?? 0, notes.length - 1);

    if (isHer) {
      const today = localDayNumber(Date.now(), clock.tz);
      const lastRead = await this.ctx.storage.get<number>("noteReadDay");
      if (lastRead === undefined) {
        await this.ctx.storage.put("noteReadDay", today);
      } else if (today > lastRead) {
        idx = Math.min(idx + 1, notes.length - 1);
        await this.ctx.storage.put("noteIdx", idx);
        await this.ctx.storage.put("noteReadDay", today);
      }
    }

    return {
      day: idx + 1,
      total: notes.length,
      text: notes[idx]!,
      final: idx >= notes.length - 1,
    };
  }

  private async build(me: string, people: Record<string, Person>, since?: number): Promise<RoomView> {
    const youLeft = !people[me] && ((await this.ctx.storage.get<string[]>("left")) ?? []).includes(me);
    const undoLeaveUntil = youLeft ? await this.undoLeaveUntil(me) : null;
    const cat = (await this.ctx.storage.get<Cat>("cat")) ?? DEFAULT_CAT;
    const clock = (await this.ctx.storage.get<Clock>("clock")) ?? DEFAULT_CLOCK;
    const log = (await this.ctx.storage.get<Visit[]>("log")) ?? [];
    const moods = (await this.ctx.storage.get<Record<string, Told>>("moods")) ?? {};
    const { him, her } = this.roles(people);
    const youAreHer = !!her && me === her;
    const seated = me === him || me === her;
    // Null unless you have a seat. Without that a stranger holding the link counts as him, so `them`
    // becomes her: her name, whether she is in the room this second, and when she was last in it.
    const otherId = seated ? (youAreHer ? him : her) : null;
    const them = otherId ? (people[otherId] ?? null) : null;
    const waitingForThem = !her;
    const kept = waitingForThem && me === him ? await this.ctx.storage.get<LeftSide>(LEFT_SIDE) : null;
    // She is the cat, so her seat goes by the name he gave her. She is never asked for one, and the
    // placeholder on her record is not a name anybody chose.
    const nameOf = (token: string | null): string | null =>
      token && token === her ? cat.name : token ? (people[token]?.name ?? null) : null;

    const theyLeft = kept && Date.now() < kept.dropsAt ? { name: cat.name, until: kept.dropsAt } : null;
    const theyWereTold = undoLeaveUntil && him ? (people[him]?.name ?? null) : null;
    const leftOut = await this.ctx.storage.get<LeftOut>("forHer");
    const held = seated ? await this.ctx.storage.get<Held>("held") : null;
    const sitting = seated ? ((await this.ctx.storage.get<Held>(SITTING)) ?? null) : null;
    const sittingNow = !!sitting && Date.now() - sitting.at < SITTING_LAPSE_MS;
    const settled = sittingNow ? ((await this.ctx.storage.get<Held>(SETTLED)) ?? null) : null;
    const waiting = seated ? ((await this.ctx.storage.get<Held>(WAITING)) ?? null) : null;
    const today = localDayNumber(Date.now(), clock.tz);
    // When she last opened the room, from before this request touched it. On her own read her `lastSeen`
    // is already now, so it has to come from `since`.
    const herLastLook = youAreHer ? (since ?? 0) : her ? (people[her]?.lastSeen ?? 0) : 0;
    const poke = seated ? await this.ctx.storage.get<Poke>("poke") : null;
    const reach = seated ? await this.ctx.storage.get<{ what: string; at: number }>("reach") : null;
    const windowLight = await this.ctx.storage.get<WindowLight>("windowLight");
    const startedAt = roomStartedAt(
      Object.values(people).map((person) => person.firstSeen),
      Date.now(),
    );

    const arrivals: Arrival[] = [];
    if (since !== undefined && seated) {
      if (youAreHer && him) {
        arrivals.push(
          ...log
            .filter((visit) => visit.who === him && visit.at > since)
            .slice(0, 4)
            .map((visit) => ({ kind: "action" as const, at: visit.at, action: visit.action })),
        );
      } else if (her) {
        const mood = moods[her];
        const lines = await this.lines();
        if (mood && mood.at > since) arrivals.push({ kind: "mood", at: mood.at, mood: mood.mood });
        const said = lines.filter((x) => x.at > since).slice(0, 6);
        for (const l of said) {
          arrivals.push({ kind: "line", at: l.at, text: l.text, gift: l.gift, note: l.about });
        }
        // A gift she sent words with is already named by the line carrying them. Both would put "Bean left
        // you a moth" and "Bean left you something" on the same card, for one moth.
        const spokenFor = new Set(said.filter((l) => l.gift).map((l) => l.at));
        arrivals.push(
          ...log
            .filter((visit) => visit.who === her && visit.at > since)
            .filter((visit) => !(visit.action === "gift" && spokenFor.has(visit.at)))
            .slice(0, 4)
            .map((visit) => ({ kind: "action" as const, at: visit.at, action: visit.action })),
        );
      }
      const hung = await this.ctx.storage.get<Doodle>("doodle");
      if (hung && hung.by !== me && hung.at > since) {
        arrivals.push({ kind: "drawn", at: hung.at, cells: hung.cells });
      }
      const undrawn = await this.ctx.storage.get<{ by: string; at: number }>("undrawn");
      if (undrawn && undrawn.by === me && undrawn.at > since) {
        arrivals.push({ kind: "undrawn", at: undrawn.at });
      }
      if (otherId) {
        for (const found of arrivalsFor(await this.found(), me, otherId, since)) {
          arrivals.push({ kind: "found", at: found.at, what: found.mutual ? found.key : null });
        }
      }
      if (youAreHer) {
        const kept = await this.ctx.storage.get<{ gift: Gift; at: number }>("giftKept");
        if (kept && kept.at > since) arrivals.push({ kind: "kept", at: kept.at, gift: kept.gift });
      }
      if (youAreHer && leftOut) {
        arrivals.push({ kind: "brought", at: leftOut.at, treat: leftOut.treat });
      }
      if (!youAreHer) {
        const took = await this.ctx.storage.get<LeftOut>("forHerTaken");
        if (took && took.at > since) arrivals.push({ kind: "took", at: took.at, treat: took.treat });
      }
      const firsts = (await this.ctx.storage.get<Record<string, number>>("firsts")) ?? {};
      for (const [what, at] of Object.entries(firsts)) {
        if (at > since) arrivals.push({ kind: "first", at, what: what as FirstKey });
      }
      arrivals.sort((a, b) => b.at - a.at);
    }

    const told = seated && her ? (moods[her] ?? null) : null;
    const catTold =
      told && localDayNumber(told.at, clock.tz) === localDayNumber(Date.now(), clock.tz) ? told : null;
    const note = await this.noteFor(clock, youAreHer, !waitingForThem);
    // Him only, and only once she is at the end. `note.final` says the same thing but rides on her
    // note, which never reaches him, so the notes running dry was his to notice or miss.
    const allNotes = await this.notes();
    const handedOver = Math.min((await this.ctx.storage.get<number>("noteIdx")) ?? 0, allNotes.length - 1);
    const sheHasReadAll = seated && !youAreHer && !!her && handedOver >= allNotes.length - 1;

    return {
      cat,
      decor: await this.ctx.storage.get<RoomDecor>("decor"),
      clock,
      youAreHer,
      youLeft,
      undoLeaveUntil,
      theyLeft,
      theyWereTold,
      catMood: catTold?.mood ?? null,
      catMoodAt: catTold?.at ?? null,
      you: nameOf(me),
      them: nameOf(otherId),
      themLastAt: them?.lastSeen ?? null,
      themHereNow: !!otherId && this.hereNow(people, otherId),
      bothHereNow: (me === him || me === her) && this.bothHere(people),
      herLine: seated ? ((await this.lines())[0] ?? null) : null,
      doodle: await this.doodleFor(me, seated),
      note: youAreHer ? note : null,
      noteDay: seated && !youAreHer ? (note?.day ?? null) : null,
      sheHasReadAll,
      notesInAll: sheHasReadAll ? allNotes.length : null,
      // The day you named, never the one they did.
      ourDay: seated ? ((await this.ctx.storage.get<OurDay>(youAreHer ? HER_DAY : "ourDay")) ?? null) : null,
      framed: (await this.ctx.storage.get<boolean>("framed")) ?? false,
      shelfDown: (await this.ctx.storage.get<boolean>("shelfDown")) ?? false,
      gift: seated ? ((await this.ctx.storage.get<Gift>("gift")) ?? null) : null,
      forHer: seated ? (leftOut?.treat ?? null) : null,
      blanket: (await this.ctx.storage.get<Blanket>("blanket")) ?? null,
      expectAt: learnedHour((await this.ctx.storage.get<Homing>("homing")) ?? null, clock.homeHour),
      sky: ((await this.ctx.storage.get<Weather>("weather"))?.sky ?? "clear") as Sky,
      windowLight: seated && !!windowLight && windowLight.from !== me,
      box: ((await this.ctx.storage.get<number>("boxDay")) ?? -1) === localDayNumber(Date.now(), clock.tz),
      boxOut:
        ((await this.ctx.storage.get<number>("boxOutDay")) ?? -1) === localDayNumber(Date.now(), clock.tz),
      brought: seated && !!leftOut,
      brushed: markLives(await this.ctx.storage.get<Mark>("brushedDay"), today, herLastLook),
      satWith: markLives(await this.ctx.storage.get<Mark>("satWithDay"), today, herLastLook),
      firstEver: seated && (people[me]?.visits ?? 0) <= 1,
      monthsOld: Math.max(0, Math.floor((Date.now() - startedAt) / (DAY_MS * 30))),
      recoveryCode: seated ? await this.recoveryCode(youAreHer ? "her" : "him") : null,
      seat: seated ? me : null,
      linked: seated ? (people[me]?.account ?? null) !== null : false,
      heldByThem: !!held && held.who === otherId && Date.now() - held.at < HELD_LAPSE_MS,
      sittingWith: sittingNow && sitting.who === me,
      sittingWithYou: sittingNow && sitting.who === otherId,
      settled: !!settled,
      waitingAtDoor: !!waiting && Date.now() - waiting.at < WAITING_LAPSE_MS,
      // Theirs only. Your own tap already moved your room; sent back it plays the wobble twice.
      pokedByThem:
        poke && poke.who === otherId && Date.now() - poke.at < POKE_LIVE_MS
          ? { what: poke.what, at: poke.at }
          : null,
      reachedTogether: reach && Date.now() - reach.at < POKE_LIVE_MS ? reach : null,
      // Keep `seated` here. Without it anybody holding the link is told what she has been doing.
      theirRecent: seated && otherId ? log.filter((v) => v.who === otherId).slice(0, 4) : [],
      theyCameAfter: !!catTold && !!them && youAreHer && them.lastSeen > catTold.at,
      arrivals,
      noticed: seated ? foundCount(await this.found()) : 0,
      bothCalledHer: seated && him && her ? bothFound(await this.found(), "herName", him, her) : false,
      awayMs: since !== undefined ? Math.max(0, Date.now() - since) : null,
      milestone: seated
        ? milestoneFor(startedAt, Date.now(), clock.tz, [
            await this.ctx.storage.get<OurDay>("ourDay"),
            await this.ctx.storage.get<OurDay>(HER_DAY),
          ])
        : null,
      personality: seated
        ? personalityFrom(
            (await this.ctx.storage.get<Tally>("tally")) ?? tallyFrom(log),
            Math.floor((Date.now() - startedAt) / DAY_MS),
          )
        : null,
      waitingForThem,
    };
  }
}
