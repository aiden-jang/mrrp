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

const PAST_DOODLES: [number, number][] = [
  [7, 5],
  [11, 7],
];

// Every size the sheet has ever been. A room nobody has opened in a year still holds whatever it
// held, so a size never leaves this list.
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

// A deleted room keeps one key: the date it went. Wiping storage outright is not enough, because
// view() seats whoever turns up when there are fewer than two people, so the next person to open a
// dead link would quietly become the maker of a new room at the same address.
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
}

export const ROOM_GONE = "mrrp: room deleted";

export class RoomGone extends Error {
  constructor() {
    super(ROOM_GONE);
  }
}

const GIFT_AFTER_MS = 8 * 60 * 60 * 1000;
const GIFTS = ["leaf", "cap", "moth"] as const;

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

    void this.refreshWeather();

    const built = await this.build(me, people, lastVisit);

    /*
     * She finds it by being handed it, and that same read spends it.
     *
     * After the view is built, not before: building is what puts it in front of her, so spending it
     * first meant she was never given the thing she had just found. No separate "take it" call --
     * there is nothing to press, and a surprise you have to press for is a chore. He learns she
     * found it from his arrival card, the way she learns he took her gift.
     */
    if (built.forHer && this.roles(people).her === me) {
      await this.ctx.storage.delete("forHer");
      await this.ctx.storage.put<LeftOut>("forHerTaken", { treat: built.forHer, at: Date.now() });
    }

    return built;
  }

  // Arrival order decides who is who, so anything handing a seat to a new token must carry the old
  // `firstSeen` over. Stamp it fresh and he becomes the second seat, which is the cat.
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
      await this.ctx.storage.delete("doodle");
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

  /*
   * Her half of `act`: the things the cat does, done on purpose.
   *
   * Deliberately not folded into the tally. That tally is what her personality is derived from, and
   * it is meant to describe what HE keeps doing for her -- adding her own doings to it would have
   * her learning traits from herself.
   */
  async herAct(me: string, act: CatAct): Promise<RoomView> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (!people[me]) return this.build(me, people);
    if (this.roles(people).her !== me) return this.build(me, people);

    if (act === "shelf") await this.ctx.storage.put("shelfDown", true);
    if (act === "box") {
      const clock = (await this.ctx.storage.get<Clock>("clock")) ?? DEFAULT_CLOCK;
      const today = localDayNumber(Date.now(), clock.tz);
      // Nothing to get into unless he has put one out.
      if (((await this.ctx.storage.get<number>("boxOutDay")) ?? -1) !== today) {
        return this.build(me, people);
      }
      await this.ctx.storage.put("boxDay", today);
    }

    const previous = (await this.ctx.storage.get<Visit[]>("log")) ?? [];
    await this.ctx.storage.put("log", [{ at: Date.now(), who: me, action: act }, ...previous].slice(0, LOG_KEEP));

    people[me].lastSeen = Date.now();
    await this.ctx.storage.put("people", people);
    return this.build(me, people);
  }

  /*
   * A box, out, for her to get into.
   *
   * Putting one out is a person's doing and getting into it is a cat's, and they were the same event
   * until now: she summoned a box out of nowhere and was already sitting in it. "Bring her something"
   * used to put it out a third of the time it was pressed, which hid that.
   */
  async putBoxOut(me: string): Promise<RoomView> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (!people[me]) return this.build(me, people);
    if (this.roles(people).him !== me) return this.build(me, people);

    const clock = (await this.ctx.storage.get<Clock>("clock")) ?? DEFAULT_CLOCK;
    await this.ctx.storage.put("boxOutDay", localDayNumber(Date.now(), clock.tz));
    const previous = (await this.ctx.storage.get<Visit[]>("log")) ?? [];
    await this.ctx.storage.put(
      "log",
      [{ at: Date.now(), who: me, action: "boxout" as const }, ...previous].slice(0, LOG_KEEP),
    );
    people[me].lastSeen = Date.now();
    await this.ctx.storage.put("people", people);
    return this.build(me, people);
  }

  /** What he leaves out for her. The other half of the gift she leaves him. */
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

  /** Which of the three she leaves him. The room still rolls one if she has not chosen. */
  async leaveGift(me: string, gift: Gift): Promise<RoomView> {
    await this.guard();
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (!people[me]) return this.build(me, people);
    if (this.roles(people).her !== me) return this.build(me, people);

    await this.ctx.storage.put("gift", gift);
    /* Her other two acts leave a record; this one did not, so the one thing she chose deliberately
       for him was the only thing of hers he was never told about. */
    const previous = (await this.ctx.storage.get<Visit[]>("log")) ?? [];
    await this.ctx.storage.put("log", [{ at: Date.now(), who: me, action: "gift" as const }, ...previous].slice(0, LOG_KEEP));
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
    /*
     * Drop the keys that were not sent.
     *
     * The route builds all six every time and leaves `undefined` in the ones the caller omitted, and
     * spreading an explicit undefined overwrites. A dress that set only the name therefore wiped her
     * fur, belly, eyes and stripes, leaving a cat the UI cannot draw. The form always sends the whole
     * look, which is why nobody had seen it.
     */
    const given = Object.fromEntries(Object.entries(cat).filter(([, v]) => v !== undefined));
    await this.ctx.storage.put("cat", { ...current, ...given });
    return true;
  }

  // Plaintext on purpose. All this code can do is become one seat of one room, and anybody who can
  // read this storage already has the room, the notes and both names.
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

  // A first that can happen twice is not a first, so this only ever writes a key that is missing.
  private async noteFirst(what: FirstKey): Promise<void> {
    if (await this.ctx.storage.get<Tombstone>(TOMBSTONE)) return;
    const firsts = (await this.ctx.storage.get<Record<string, number>>("firsts")) ?? {};
    if (firsts[what]) return;
    firsts[what] = Date.now();
    await this.ctx.storage.put("firsts", firsts);
  }

  // Runs behind the response, never in front of it. The stamp is written before the request, so a
  // service that is down is asked every half hour rather than on every read.
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

  // The first time he looks in each day. He tells the room "usually home around six" once and never
  // again; life moves and the hour he typed does not.
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

  // Every method a route can reach calls this first. A test walks the prototype and fails if a new
  // one does not, because the one that forgets is the one that hands a dead link to a stranger as a
  // fresh room.
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
    /*
     * He signs his own name, not hers.
     *
     * This used to ask for the cat's name, which read as a nice touch while the cat was a pet. She
     * is the cat, so it had become "type her name to erase her", which is not a thing to ask of
     * anybody. His own name keeps the deliberateness -- you cannot do this by leaning on a key --
     * without making the last thing he does in here be typing her out of it.
     */
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

  // `bar` is the difference between her leaving and him freeing her seat. Leaving must stop this
  // browser being seated again by its own next page load, or leaving undoes itself. Him freeing the
  // seat must NOT bar anything: that button exists so the right person can take a seat back.
  private async wipeHerSide(people: Record<string, Person>, bar: boolean): Promise<void> {
    const her = this.roles(people).her;
    if (!her) return;

    const moods = (await this.ctx.storage.get<Record<string, Told>>("moods")) ?? {};
    const log = (await this.ctx.storage.get<Visit[]>("log")) ?? [];
    const light = await this.ctx.storage.get<WindowLight>("windowLight");
    const recovery = await this.ctx.storage.get<string>("recoveryHer");

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
    await this.ctx.storage.put("handover", her);

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
    /* Same rule the room uses: her seat is called by the name he gave her. This is a keepsake, and a
       keepsake that calls her "Someone" is worse than one that does not name her at all. */
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
      clock,
      blanket: (await this.ctx.storage.get<Blanket>("blanket")) ?? null,
      ourDay: (await this.ctx.storage.get<OurDay>("ourDay")) ?? null,
      drawing: ((c) => (c ? widenDoodle(c) : null))((await this.ctx.storage.get<Doodle>("doodle"))?.cells),
      notes: youAreHer ? notes.slice(0, readSoFar + 1) : notes,
      notesInAll: notes.length,
      found: Object.keys(await this.found()),
      herLine: (await this.ctx.storage.get<Told2>("herLine")) ?? null,
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

    // Moving her timezone moves the window with her. He opens the room before he picks it, so the
    // first lookup is always for the default and the first thing he does after is change it.
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
    const kept = waitingForThem && me === him ? await this.ctx.storage.get<LeftSide>(LEFT_SIDE) : null;
    /*
     * What to call a seat.
     *
     * She is the cat, so her seat is called by the name he chose for her; she is never asked for one
     * and the placeholder her record carries is not a name anybody should read. His seat is his own
     * name, because he is a person in the room rather than the cat in it.
     */
    const nameOf = (token: string | null): string | null =>
      token && token === her ? cat.name : token ? (people[token]?.name ?? null) : null;

    /* The seat she left is hers, so it is her name that left, not the placeholder on her record. */
    const theyLeft =
      kept && Date.now() < kept.dropsAt ? { name: cat.name, until: kept.dropsAt } : null;
    const theyWereTold = undoLeaveUntil && him ? (people[him]?.name ?? null) : null;
    const leftOut = await this.ctx.storage.get<LeftOut>("forHer");
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
        // Her doings reach him the same way his reach her: the room is different when he opens it.
        arrivals.push(
          ...log
            .filter((visit) => visit.who === her && visit.at > since)
            .slice(0, 4)
            .map((visit) => ({ kind: "action" as const, at: visit.at, action: visit.action })),
        );
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
      /*
       * Say it in words as well as in the room.
       *
       * The animation is five or six seconds, once, and it is suppressed outright when the cat is at
       * the door -- which is what she does when somebody opens the room -- and under reduced motion
       * for two of the three. The moment is the nice part; this is the part that cannot be missed.
       */
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
      you: nameOf(me),
      them: nameOf(otherId),
      themLastAt: them?.lastSeen ?? null,
      themHereNow: !!them && Date.now() - them.lastSeen < HERE_NOW_MS,
      bothHereNow: (me === him || me === her) && this.bothHere(people),
      herLine: seated ? ((await this.ctx.storage.get<Told2>("herLine")) ?? null) : null,
      doodle: await this.doodleFor(me, seated),
      note: youAreHer ? note : null,
      noteDay: seated && !youAreHer ? (note?.day ?? null) : null,
      yourNotes: seated && !youAreHer ? await this.notes() : null,
      ourDay: seated && !youAreHer ? ((await this.ctx.storage.get<OurDay>("ourDay")) ?? null) : null,
      framed: (await this.ctx.storage.get<boolean>("framed")) ?? false,
      shelfDown: (await this.ctx.storage.get<boolean>("shelfDown")) ?? false,
      /*
       * Both of them, now that it is hers to choose rather than the room's to roll.
       *
       * It was his alone because it was a surprise he found on the floor. It still is -- he is the
       * one who picks it up, and taking it is what tells her he was here -- but she has to be able
       * to see what she left him, or choosing is choosing into the dark.
       */
      gift: seated ? ((await this.ctx.storage.get<Gift>("gift")) ?? null) : null,
      /*
       * Both of them, for different reasons: she finds it, and he needs to see it is still out.
       *
       * It was hers alone at first, on the reasoning that he knows what he left. He does not: with
       * nothing shown on his side, leaving something out looked exactly like a button that does not
       * work, and there was no way to tell "still waiting" from "she has been in and found it".
       */
      forHer: seated ? (leftOut?.treat ?? null) : null,
      blanket: (await this.ctx.storage.get<Blanket>("blanket")) ?? null,
      expectAt: learnedHour((await this.ctx.storage.get<Homing>("homing")) ?? null, clock.homeHour),
      sky: ((await this.ctx.storage.get<Weather>("weather"))?.sky ?? "clear") as Sky,
      windowLight: seated && !!windowLight && windowLight.from !== me,
      box: ((await this.ctx.storage.get<number>("boxDay")) ?? -1) === localDayNumber(Date.now(), clock.tz),
      boxOut:
        ((await this.ctx.storage.get<number>("boxOutDay")) ?? -1) === localDayNumber(Date.now(), clock.tz),
      /*
       * The thing he left out, sitting on the floor.
       *
       * This sprite used to be set by "bring her something", which rolled a die and could not say
       * what it brought. It draws the thing he actually chose now, which also means she can see it
       * waiting rather than only catching a six-second animation.
       */
      brought: seated && !!leftOut,
      brushed:
        ((await this.ctx.storage.get<number>("brushedDay")) ?? -1) === localDayNumber(Date.now(), clock.tz),
      satWith:
        ((await this.ctx.storage.get<number>("satWithDay")) ?? -1) === localDayNumber(Date.now(), clock.tz),
      firstEver: seated && (people[me]?.visits ?? 0) <= 1,
      monthsOld: Math.max(0, Math.floor((Date.now() - startedAt) / (DAY_MS * 30))),
      recoveryCode: seated ? await this.recoveryCode(youAreHer ? "her" : "him") : null,
      seat: seated ? me : null,
      linked: seated ? (people[me]?.account ?? null) !== null : false,
      /*
       * Whatever the other one did, whichever seat is asking. It used to be his doings only,
       * because only his existed; hers do now.
       *
       * `seated` is load-bearing: the old form keyed on youAreHer, which excluded a stranger by
       * accident rather than on purpose. Making it symmetric handed her doings to anybody holding
       * the link.
       */
      theirRecent: seated && otherId ? log.filter((v) => v.who === otherId).slice(0, 4) : [],
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
