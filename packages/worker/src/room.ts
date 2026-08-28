import { DurableObject } from "cloudflare:workers";
import type {
  Action,
  Arrival,
  Cat,
  Clock,
  Doodle,
  Gift,
  Mood,
  Note,
  RoomView,
  Told,
  Told2,
  Visit,
} from "./types.js";
import { NOTES } from "./notes.js";
import { isBlanketKey, type BlanketKey } from "./blanket.js";
import { lookOutside, WEATHER_STALE_MS, type Sky, type Weather } from "./weather.js";
import type { FirstKey } from "./types.js";
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

const DOODLE_W = 15;
const DOODLE_H = 9;
const DOODLE_CELLS = DOODLE_W * DOODLE_H;

// Every size the sheet has ever been. Drawings that size are hanging in real rooms, so they are
// widened on the way out rather than thrown away, and a size never leaves this list: a room nobody
// has opened in a year still holds whatever it held.
const PAST_DOODLES: [number, number][] = [
  [7, 5],
  [11, 7],
];

function widenDoodle(cells: string): string {
  const was = PAST_DOODLES.find(([w, h]) => w * h === cells.length);
  if (!was) return cells;
  const [oldW, oldH] = was;
  const dx = Math.floor((DOODLE_W - oldW) / 2);
  const dy = Math.floor((DOODLE_H - oldH) / 2);
  const out = Array.from({ length: DOODLE_CELLS }, () => "0");
  for (let y = 0; y < oldH; y++) {
    for (let x = 0; x < oldW; x++) out[(y + dy) * DOODLE_W + (x + dx)] = cells[y * oldW + x]!;
  }
  return out.join("");
}

const LOG_KEEP = 40;
// Enough that leaving holds on every browser she has used. It is a list of random tokens, not names.
const LEFT_KEEP = 20;
const HERE_NOW_MS = 3 * 60_000;
const DEFAULT_CAT: Cat = {
  name: "Bean",
  fur: "#e8963f",
  furDk: "#c9752a",
  belly: "#fbf0dd",
  eyes: "#7cb342",
  tabby: true,
};
const DEFAULT_CLOCK: Clock = { tz: "America/New_York", homeHour: 18 };

// A deleted room keeps exactly one key once it has been erased: the date it went. Wiping storage
// outright is not enough, because view() seats whoever turns up when there are fewer than two people,
// so the next person to open a dead link would silently become the maker of a brand new room at the
// same address.
const TOMBSTONE = "deleted";

// Deleting is instant for both of them and reversible for a week by the one who did it. The room is
// unreachable the whole time; the week only decides how long the bytes stay recoverable.
const UNDO_MS = 7 * DAY_MS;

interface Tombstone {
  at: number;
  erasesAt: number;
}

const LEFT_SIDE = "leftSide";

// What she took out of the room, kept just long enough to put back. The seat is genuinely free the
// whole time: he can hand it to somebody else, and if he does, this stops being restorable.
interface LeftSide {
  token: string;
  at: number;
  dropsAt: number;
  person: Person;
  mood?: Told;
  visits: Visit[];
  recovery?: string;
  light?: WindowLight;
}

// Thrown by every method on a deleted room. index.ts turns it into a 410. Matched by message, not by
// class, because a Durable Object RPC boundary carries the message across and not the prototype.
export const ROOM_GONE = "mrrp: room deleted";

export class RoomGone extends Error {
  constructor() {
    super(ROOM_GONE);
  }
}

const GIFT_AFTER_MS = 8 * 60 * 60 * 1000;
const GIFTS = ["leaf", "cap", "moth"] as const;

// The same arithmetic as hourIn in the web package's hours.ts. Duplicated rather than shared, like
// everything else these two packages both need.
function hourInZone(at: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(at));
  const h = Number(parts.find((x) => x.type === "hour")?.value ?? 12);
  const m = Number(parts.find((x) => x.type === "minute")?.value ?? 0);
  return (h % 24) + m / 60;
}

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
  account?: string;
}

interface Blanket {
  key: BlanketKey;
  stripe: boolean;
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
    // A signed-in person is whichever seat they tied to this room, in any browser. `seat` goes back in
    // the view so the client adopts it, which is why nothing else in here knows about accounts.
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

    // The first time he looks in today, in her timezone, which is the clock the whole room runs on.
    // Only his: she is the cat, and the cat does not wait at the door for herself.
    if (this.roles(people).him === me) await this.noteHomecoming();

    const handover = await this.ctx.storage.get<string>("handover");
    if (handover && handover !== me && this.roles(people).her === me) {
      await this.adoptFound(handover, me);
      await this.ctx.storage.delete("handover");
    }

    const { him: h, her: hr } = this.roles(people);
    if (hr && me === hr && Math.random() < 0.18) {
      if (!(await this.ctx.storage.get<boolean>("shelfDown"))) {
        await this.ctx.storage.put("shelfDown", true);
      }
    }
    if (hr && me === hr && h && now - (people[h]?.lastSeen ?? 0) > GIFT_AFTER_MS) {
      if (!(await this.ctx.storage.get<string>("gift"))) {
        await this.ctx.storage.put("gift", GIFTS[Math.floor(Math.random() * GIFTS.length)]!);
      }
    }

    // Kicked off behind the response, never in front of it. This read serves whatever the window
    // last knew, including nothing at all on the very first visit, and the next one has the answer.
    // Weather is ambient: it is not worth a single millisecond of somebody waiting for their room.
    void this.refreshWeather();

    return this.build(me, people, lastVisit);
  }

  // Arrival order decides who is who, so anything that hands a seat to a new token must carry the old
  // `firstSeen` over. Stamp it fresh and he becomes the second seat, which is the cat.
  private roles(people: Record<string, Person>): { him: string | null; her: string | null } {
    const ids = Object.keys(people).sort((a, b) => people[a]!.firstSeen - people[b]!.firstSeen);
    return { him: ids[0] ?? null, her: ids[1] ?? null };
  }

  async act(me: string, action: Action): Promise<RoomView> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (!people[me]) return this.build(me, people);
    // Checked here and not only in the UI. Her side does not render these buttons, but a request is a
    // request and the link is the only credential anybody needs to send one.
    if (this.roles(people).him !== me) return this.build(me, people);

    if (action === "photo") {
      await this.ctx.storage.put("framed", true);
      await this.ctx.storage.delete("doodle");
    }

    if (action === "bring") {
      const clock = (await this.ctx.storage.get<Clock>("clock")) ?? DEFAULT_CLOCK;
      const today = localDayNumber(Date.now(), clock.tz);
      if (Math.random() < 1 / 3) await this.ctx.storage.put("boxDay", today);
      else await this.ctx.storage.put("broughtDay", today);
    }

    if (action === "brush" || action === "sit") {
      const clock = (await this.ctx.storage.get<Clock>("clock")) ?? DEFAULT_CLOCK;
      const key = action === "brush" ? "brushedDay" : "satWithDay";
      await this.ctx.storage.put(key, localDayNumber(Date.now(), clock.tz));
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

  async dress(me: string, cat: Partial<Cat>): Promise<boolean> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (this.roles(people).him !== me) return false;
    const current = (await this.ctx.storage.get<Cat>("cat")) ?? DEFAULT_CAT;
    await this.ctx.storage.put("cat", { ...current, ...cat });
    return true;
  }

  // Plaintext on purpose. All this code can do is become one seat of one room, and anybody who can
  // read this storage already has the room, the notes and both names.
  private async recoveryCode(seat: "him" | "her"): Promise<string> {
    const key = seat === "him" ? "recovery" : "recoveryHer";
    const existing = await this.ctx.storage.get<string>(key);
    if (existing) return existing;
    const A = "abcdefghijkmnpqrstuvwxyz23456789"; // no l, o, 0, 1
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
    const next: FoundLedger = {};
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
    const next: FoundLedger = {};
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

    /*
     * The one secret that cannot be found alone, and the only reason it is worth having.
     *
     * Checked here rather than in the browser, because the browser is where somebody who wanted to
     * tick it off on their own would go. Every other discovery is a thing you notice; this one is a
     * thing the cat only does when both of you are in the room, so the room is what has to say so.
     */
    if (key === "belly" && !this.bothHere(people)) return false;

    const before = await this.found();
    const { ledger, isNew } = recordFound(before, key as DiscoveryKey, me, Date.now());
    if (isNew) await this.ctx.storage.put("found", ledger);
    return true;
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
      .map((n) => n.trim().slice(0, 280))
      .filter(Boolean)
      .slice(0, 120);
    if (clean.length === 0) {
      await this.ctx.storage.delete("notes");
    } else {
      await this.ctx.storage.put("notes", clean);
      const idx = (await this.ctx.storage.get<number>("noteIdx")) ?? 0;
      if (idx > clean.length - 1) await this.ctx.storage.put("noteIdx", clean.length - 1);
    }
    return true;
  }

  // Every public method calls this first. A test walks the prototype and fails if a new one does not,
  // because the one that forgets is the one that resurrects a deleted room.
  /*
   * The first time the world does something to this room, kept once and never updated.
   *
   * Not a calendar milestone: those are all "how long has this been going", and these are "this has
   * never happened here before". A first that can happen twice is not a first, so this only ever
   * writes a key that is missing.
   */
  private async noteFirst(what: FirstKey): Promise<void> {
    // Checked again here, not just by the caller. This runs in the turn a weather lookup came back
    // in, and a room deleted since then must not have a key written back into it.
    if (await this.ctx.storage.get<Tombstone>(TOMBSTONE)) return;
    const firsts = (await this.ctx.storage.get<Record<string, number>>("firsts")) ?? {};
    if (firsts[what]) return;
    firsts[what] = Date.now();
    await this.ctx.storage.put("firsts", firsts);
  }

  private async refreshWeather(): Promise<void> {
    const current = await this.ctx.storage.get<Weather>("weather");
    if (current && Date.now() - current.at < WEATHER_STALE_MS) return;
    // Stamped before the request, not after, so a service that is down is asked every half hour
    // rather than on every single read.
    const at = Date.now();
    await this.ctx.storage.put<Weather>("weather", { sky: current?.sky ?? "clear", at });

    const clock = (await this.ctx.storage.get<Clock>("clock")) ?? DEFAULT_CLOCK;
    this.ctx.waitUntil(
      lookOutside(clock.tz, this.env.WEATHER_URL).then(async (sky) => {
        if (!sky) return;
        // Checked again on the way back, because this lands in a later turn than the read that
        // started it. Between the two, the room can have been deleted, and writing here would put a
        // key back into storage that erasing had just taken out.
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
    const now = Date.now();
    if (!him || !her) return false;
    return now - people[him]!.lastSeen < HERE_NOW_MS && now - people[her]!.lastSeen < HERE_NOW_MS;
  }

  private async guard(): Promise<void> {
    const stone = await this.ctx.storage.get<Tombstone>(TOMBSTONE);
    if (!stone) return;
    // Belt and braces with the alarm. If the alarm never ran, the first request after the week is up
    // does the erasing, so the promise does not depend on a timer having fired.
    if (Date.now() >= stone.erasesAt) await this.erase(stone);
    throw new RoomGone();
  }

  // What the maker gets instead of the plain gone screen, for as long as he can still change his mind.
  // Null for her and for strangers: the room is simply gone to them, which is what deleting it meant.
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

  // The only alarm in the app, and the only thing here that happens without somebody visiting. It has
  // to be: a delete that only completes if one of them comes back is not a delete, and neither is a
  // week of her data kept in a room nobody opens again.
  async alarm(): Promise<void> {
    const stone = await this.ctx.storage.get<Tombstone>(TOMBSTONE);
    if (stone && Date.now() >= stone.erasesAt) {
      // Erasing takes the whole room, including anything she left behind, so nothing else to do.
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

  // His to delete, because he made it. Typing the cat's name is the only thing standing between a
  // mis-tap and both of their years, so it is checked here and not only in the UI.
  async deleteRoom(me: string, typed: string): Promise<number | false> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (this.roles(people).him !== me) return false;
    const cat = (await this.ctx.storage.get<Cat>("cat")) ?? DEFAULT_CAT;
    if (typed.trim().toLowerCase() !== cat.name.trim().toLowerCase()) return false;

    const at = Date.now();
    const erasesAt = at + UNDO_MS;
    await this.ctx.storage.put<Tombstone>(TOMBSTONE, { at, erasesAt });
    await this.scheduleNext();
    return erasesAt;
  }

  // Hers to leave, so she has a way out that does not cost him the room. Same wipe as him freeing her
  // seat, which is why both call one place: her side gone, his year untouched.
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

  // Everything that was hers, and nothing that was his. Called both when he frees her seat and when
  // she leaves on her own, so the two can never drift into wiping different things.
  //
  // `bar` is the difference between the two. Leaving has to stop this browser being seated again by
  // its own next page load, or leaving undoes itself the moment she reopens the link. Him freeing the
  // seat must NOT bar anything: that button exists so the right person can take a seat back, and
  // barring the token would lock out the case where the browser holding it is hers.
  private async wipeHerSide(people: Record<string, Person>, bar: boolean): Promise<void> {
    const her = this.roles(people).her;
    if (!her) return;

    const moods = (await this.ctx.storage.get<Record<string, Told>>("moods")) ?? {};
    const log = (await this.ctx.storage.get<Visit[]>("log")) ?? [];
    const light = await this.ctx.storage.get<WindowLight>("windowLight");
    const recovery = await this.ctx.storage.get<string>("recoveryHer");

    // Kept only when she is the one leaving. Him freeing the seat is not a thing anybody undoes: it
    // is done precisely because whoever held that seat is not coming back to that browser.
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
    await this.ctx.storage.delete("recoveryHer");
    // What she had noticed waits for whoever takes the seat next, or the seat emptying quietly takes
    // the collar off the cat.
    await this.ctx.storage.put("handover", her);

    if (bar) {
      const left = (await this.ctx.storage.get<string[]>("left")) ?? [];
      await this.ctx.storage.put("left", [her, ...left.filter((t) => t !== her)].slice(0, LEFT_KEEP));
      await this.scheduleNext();
    }
  }

  // Whether she can still put her side back, and until when. Null once the week is up, once somebody
  // else has taken the empty seat, or for anybody who is not her.
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

    // Her original firstSeen goes back untouched. Stamp it fresh and she sorts after him differently
    // only by luck; the whole notion of who the cat is rests on that one number.
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
    if (kept.recovery) await this.ctx.storage.put("recoveryHer", kept.recovery);
    if (kept.light) await this.ctx.storage.put("windowLight", kept.light);

    // Only if nobody has claimed it. Once her ledger has been adopted by a new seat it is theirs, and
    // taking it back off them would be the same bug in the other direction.
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

  // Drops what she left behind once the week is up, and hands back what is still inside it.
  private async sweepLeftSide(): Promise<LeftSide | null> {
    const kept = await this.ctx.storage.get<LeftSide>(LEFT_SIDE);
    if (!kept) return null;
    if (Date.now() < kept.dropsAt) return kept;
    await this.ctx.storage.delete(LEFT_SIDE);
    return null;
  }

  // One alarm, two possible deadlines. Whichever comes first wins, and alarm() reschedules for the
  // other one if it is still out there.
  private async scheduleNext(): Promise<void> {
    const stone = await this.ctx.storage.get<Tombstone>(TOMBSTONE);
    const kept = await this.ctx.storage.get<LeftSide>(LEFT_SIDE);
    const due = [stone?.erasesAt, kept?.dropsAt].filter((t): t is number => typeof t === "number");
    if (due.length === 0) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(Math.min(...due));
  }

  // Hers, and the only thing in the room that is. Checked here rather than only at the route, like
  // every other rule about who may write what.
  async setBlanket(me: string, key: unknown, stripe: unknown): Promise<boolean> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (this.roles(people).her !== me) return false;
    if (!isBlanketKey(key)) return false;
    await this.ctx.storage.put<Blanket>("blanket", { key, stripe: stripe === true });
    return true;
  }

  /*
   * Everything the room holds about the two of them, as one file they can keep.
   *
   * The room is the only copy of any of this, and the privacy policy's answer to "can I have it" was
   * an email address. This is the same answer, self-serve.
   *
   * Gated exactly like the view is, and for the same reason: her copy stops at the note she has
   * actually read. An export that hands her the rest is the read-ahead leak with a filename on it,
   * and it would be the easiest one in the app to miss, because nobody looks at a download twice.
   */
  async exportFor(me: string): Promise<Record<string, unknown> | null> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    const { him, her } = this.roles(people);
    if (me !== him && me !== her) return null;

    const youAreHer = me === her;
    const clock = (await this.ctx.storage.get<Clock>("clock")) ?? DEFAULT_CLOCK;
    const notes = await this.notes();
    const readSoFar = Math.min((await this.ctx.storage.get<number>("noteIdx")) ?? 0, notes.length - 1);

    return {
      takenAt: new Date().toISOString(),
      you: people[me]?.name ?? null,
      them: (youAreHer ? him : her) ? (people[youAreHer ? him! : her!]?.name ?? null) : null,
      youAreTheCat: youAreHer,
      startedAt: new Date(
        roomStartedAt(
          Object.values(people).map((person) => person.firstSeen),
          Date.now(),
        ),
      ).toISOString(),
      cat: (await this.ctx.storage.get<Cat>("cat")) ?? DEFAULT_CAT,
      clock,
      blanket: (await this.ctx.storage.get<Blanket>("blanket")) ?? null,
      ourDay: (await this.ctx.storage.get<OurDay>("ourDay")) ?? null,
      drawing: ((c) => (c ? widenDoodle(c) : null))((await this.ctx.storage.get<Doodle>("doodle"))?.cells),
      // His in full, hers up to the one she has read. The count is not a secret; the words are.
      notes: youAreHer ? notes.slice(0, readSoFar + 1) : notes,
      notesInAll: notes.length,
      found: Object.keys(await this.found()),
      /*
       * Her words and her moods, which are the most personal things in here after his notes.
       *
       * These were missing from the first version of this export while the privacy page said it hands
       * you everything, which made the page wrong rather than the code incomplete. If something new
       * gets stored about either of them, it belongs here too.
       */
      herLine: (await this.ctx.storage.get<Told2>("herLine")) ?? null,
      moodNow: (await this.ctx.storage.get<Record<string, Told>>("moods"))?.[her ?? ""] ?? null,
      whatHeHasDone: (await this.ctx.storage.get<Tally>("tally")) ?? {},
      lately: (await this.ctx.storage.get<Visit[]>("log")) ?? [],
      // Only in his copy, like the line about it in the room: it is a thing the room worked out about
      // him, and to her it would read as the room reporting on somebody.
      expectsHimAt: youAreHer
        ? null
        : learnedHour((await this.ctx.storage.get<Homing>("homing")) ?? null, clock.homeHour),
      visits: Object.fromEntries(
        Object.entries(people).map(([token, person]) => [
          token === me ? "you" : "them",
          { name: person.name, since: new Date(person.firstSeen).toISOString(), times: person.visits },
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

  async say(me: string, text: string): Promise<RoomView> {
    await this.guard();
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

  async draw(me: string, cells: string): Promise<RoomView> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (!people[me]) return this.build(me, people);
    const { him, her } = this.roles(people);
    if (me !== him && me !== her) return this.build(me, people);
    // Checked here as well as at the route. The route is not the only way in, and these cells get
    // drawn a pixel at a time.
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
    // A fortnight of him turning up at the same hour, without waiting a fortnight. Nothing here puts
    // the room in a state it could not reach on its own; this one just takes two weeks otherwise.
    //
    // Stamped with today, so the read that comes back with the answer does not immediately count
    // itself as another day and drag the average toward whatever o'clock it is now.
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

  async setOurDay(me: string, day: OurDay | null): Promise<boolean> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (this.roles(people).him !== me) return false;
    if (day) await this.ctx.storage.put("ourDay", day);
    else await this.ctx.storage.delete("ourDay");
    return true;
  }

  async setClock(me: string, clock: Partial<Clock>): Promise<boolean> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (this.roles(people).him !== me) return false;
    const current = (await this.ctx.storage.get<Clock>("clock")) ?? DEFAULT_CLOCK;
    await this.ctx.storage.put("clock", { ...current, ...clock });

    // Moving her to another timezone moves the window with her. Without this the room keeps showing
    // whatever the sky was doing over the old one for up to half an hour, and on the ordinary setup
    // path that is always wrong: he opens the room before he picks her timezone, so the first lookup
    // is for the default and the first thing he does afterwards is change it.
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
    const otherId = youAreHer ? him : her;
    const them = otherId ? (people[otherId] ?? null) : null;
    const waitingForThem = !her;
    // Told to him and to nobody else, and only while it is still true. He is the one who can close her
    // way back by giving the seat away, so he is the one who has to know it is open.
    const kept = waitingForThem && me === him ? await this.ctx.storage.get<LeftSide>(LEFT_SIDE) : null;
    const theyLeft =
      kept && Date.now() < kept.dropsAt ? { name: kept.person.name, until: kept.dropsAt } : null;
    // She is told he was told. The two flags open and close under exactly the same conditions, so
    // there is no state where one of them is looking at something the other one is not.
    const theyWereTold = undoLeaveUntil && him ? (people[him]?.name ?? null) : null;
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
        const line = (await this.ctx.storage.get<Told2>("herLine")) ?? null;
        if (mood && mood.at > since) arrivals.push({ kind: "mood", at: mood.at, mood: mood.mood });
        if (line && line.at > since) arrivals.push({ kind: "line", at: line.at, text: line.text });
      }
      const hung = await this.ctx.storage.get<Doodle>("doodle");
      if (hung && hung.by !== me && hung.at > since) {
        arrivals.push({ kind: "drawn", at: hung.at, cells: hung.cells });
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
      // Shown to whoever was away when it happened, like everything else on this card, and to both of
      // them rather than only to her: it happened to the room, not to one of them.
      const firsts = (await this.ctx.storage.get<Record<string, number>>("firsts")) ?? {};
      for (const [what, at] of Object.entries(firsts)) {
        if (at > since) arrivals.push({ kind: "first", at, what: what as FirstKey });
      }
      arrivals.sort((a, b) => b.at - a.at);
    }

    const told = seated && her ? (moods[her] ?? null) : null;
    // A mood belongs to the day it was said. Derived from the timestamp rather than stored, so it is
    // right for the moods already in storage. The arrival card is deliberately not gated this way: it
    // is a record of what happened, which stays true after midnight.
    const catTold =
      told && localDayNumber(told.at, clock.tz) === localDayNumber(Date.now(), clock.tz) ? told : null;
    const note = await this.noteFor(clock, youAreHer, !waitingForThem);

    return {
      cat,
      clock,
      youAreHer,
      youLeft,
      undoLeaveUntil,
      theyLeft,
      theyWereTold,
      catMood: catTold?.mood ?? null,
      catMoodAt: catTold?.at ?? null,
      you: people[me]?.name ?? null,
      them: them?.name ?? null,
      themLastAt: them?.lastSeen ?? null,
      themHereNow: !!them && Date.now() - them.lastSeen < HERE_NOW_MS,
      // Through the same helper the belly discovery is gated on, so the thing she is told is happening
      // and the thing the room will accept can never drift apart.
      bothHereNow: (me === him || me === her) && this.bothHere(people),
      herLine: seated ? ((await this.ctx.storage.get<Told2>("herLine")) ?? null) : null,
      doodle: await this.doodleFor(me, seated),
      note: youAreHer ? note : null,
      noteDay: seated && !youAreHer ? (note?.day ?? null) : null,
      yourNotes: seated && !youAreHer ? await this.notes() : null,
      ourDay: seated && !youAreHer ? ((await this.ctx.storage.get<OurDay>("ourDay")) ?? null) : null,
      framed: (await this.ctx.storage.get<boolean>("framed")) ?? false,
      shelfDown: (await this.ctx.storage.get<boolean>("shelfDown")) ?? false,
      gift: me === him ? ((await this.ctx.storage.get<Gift>("gift")) ?? null) : null,
      blanket: (await this.ctx.storage.get<Blanket>("blanket")) ?? null,
      expectAt: learnedHour((await this.ctx.storage.get<Homing>("homing")) ?? null, clock.homeHour),
      sky: ((await this.ctx.storage.get<Weather>("weather"))?.sky ?? "clear") as Sky,
      windowLight: seated && !!windowLight && windowLight.from !== me,
      box: ((await this.ctx.storage.get<number>("boxDay")) ?? -1) === localDayNumber(Date.now(), clock.tz),
      brought:
        ((await this.ctx.storage.get<number>("broughtDay")) ?? -1) === localDayNumber(Date.now(), clock.tz),
      brushed:
        ((await this.ctx.storage.get<number>("brushedDay")) ?? -1) === localDayNumber(Date.now(), clock.tz),
      satWith:
        ((await this.ctx.storage.get<number>("satWithDay")) ?? -1) === localDayNumber(Date.now(), clock.tz),
      firstEver: seated && (people[me]?.visits ?? 0) <= 1,
      monthsOld: Math.max(0, Math.floor((Date.now() - startedAt) / (DAY_MS * 30))),
      recoveryCode: seated ? await this.recoveryCode(youAreHer ? "her" : "him") : null,
      seat: seated ? me : null,
      linked: seated ? (people[me]?.account ?? null) !== null : false,
      theirRecent: youAreHer && him ? log.filter((v) => v.who === him).slice(0, 4) : [],
      theyCameAfter: !!catTold && !!them && youAreHer && them.lastSeen > catTold.at,
      arrivals,
      noticed: seated ? foundCount(await this.found()) : 0,
      bothCalledHer: seated && him && her ? bothFound(await this.found(), "herName", him, her) : false,
      awayMs: since !== undefined ? Math.max(0, Date.now() - since) : null,
      milestone: seated
        ? milestoneFor(startedAt, Date.now(), clock.tz, await this.ctx.storage.get<OurDay>("ourDay"))
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
