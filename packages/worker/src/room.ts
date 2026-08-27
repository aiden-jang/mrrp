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
  roomStartedAt,
  tallyFrom,
  type OurDay,
  type Tally,
} from "./remembers.js";

const DOODLE_CELLS = 35;

const LOG_KEEP = 40;
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

const GIFT_AFTER_MS = 8 * 60 * 60 * 1000;
const GIFTS = ["leaf", "cap", "moth"] as const;

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

interface WindowLight {
  from: string;
  at: number;
}

export class Room extends DurableObject<Env> {
  async view(me: string, name: string | null, account?: string | null): Promise<RoomView> {
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    const now = Date.now();
    // A signed-in person is whichever seat they tied to this room, in any browser. `seat` goes back in
    // the view so the client adopts it, which is why nothing else in here knows about accounts.
    const bound = account ? Object.keys(people).find((t) => people[t]?.account === account) : undefined;
    if (bound && bound !== me) return this.view(bound, name);
    const lastVisit = people[me]?.lastSeen;

    if (!people[me] && Object.keys(people).length < 2) {
      people[me] = { name: name?.trim().slice(0, 24) || "Someone", firstSeen: now, lastSeen: now, visits: 0 };
    }
    if (people[me]) {
      people[me].lastSeen = now;
      people[me].visits += 1;
      await this.ctx.storage.put("people", people);
    }

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

    return this.build(me, people, lastVisit);
  }

  // Arrival order decides who is who, so anything that hands a seat to a new token must carry the old
  // `firstSeen` over. Stamp it fresh and he becomes the second seat, which is the cat.
  private roles(people: Record<string, Person>): { him: string | null; her: string | null } {
    const ids = Object.keys(people).sort((a, b) => people[a]!.firstSeen - people[b]!.firstSeen);
    return { him: ids[0] ?? null, her: ids[1] ?? null };
  }

  async act(me: string, action: Action): Promise<RoomView> {
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
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    const { him, her } = this.roles(people);
    if (me !== him && me !== her) return false;
    await this.ctx.storage.put("shelfDown", false);

    const again = Math.random() < 1 / 3;
    if (again) await this.ctx.storage.put("shelfDown", true);
    return again ? "again" : "tidy";
  }

  async touchWindowLight(me: string): Promise<RoomView | null> {
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
    if (!isDiscoveryKey(key)) return false;
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    const { him, her } = this.roles(people);
    if (me !== him && me !== her) return false;

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

  async releaseHerSeat(me: string): Promise<boolean> {
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    const { him, her } = this.roles(people);
    if (him !== me || !her) return false;

    const moods = (await this.ctx.storage.get<Record<string, Told>>("moods")) ?? {};
    delete moods[her];
    delete people[her];
    await this.ctx.storage.put("people", people);
    await this.ctx.storage.put("moods", moods);
    const log = (await this.ctx.storage.get<Visit[]>("log")) ?? [];
    await this.ctx.storage.put(
      "log",
      log.filter((v) => v.who !== her),
    );
    const light = await this.ctx.storage.get<WindowLight>("windowLight");
    if (light?.from === her) await this.ctx.storage.delete("windowLight");
    await this.ctx.storage.delete("recoveryHer");
    // What she had noticed waits for whoever takes the seat next, or freeing her seat quietly takes
    // the collar off the cat.
    await this.ctx.storage.put("handover", her);
    return true;
  }

  async tell(me: string, mood: Mood): Promise<RoomView> {
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
    want: { days?: number; tally?: Tally; noteIdx?: number; awayHours?: number },
  ): Promise<RoomView> {
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
    if (want.noteIdx !== undefined) {
      const clock = (await this.ctx.storage.get<Clock>("clock")) ?? DEFAULT_CLOCK;
      await this.ctx.storage.put("noteIdx", Math.max(0, want.noteIdx));
      await this.ctx.storage.put("noteReadDay", localDayNumber(Date.now(), clock.tz));
    }
    return this.build(me, people);
  }

  async setOurDay(me: string, day: OurDay | null): Promise<boolean> {
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (this.roles(people).him !== me) return false;
    if (day) await this.ctx.storage.put("ourDay", day);
    else await this.ctx.storage.delete("ourDay");
    return true;
  }

  async setClock(me: string, clock: Partial<Clock>): Promise<boolean> {
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (this.roles(people).him !== me) return false;
    const current = (await this.ctx.storage.get<Clock>("clock")) ?? DEFAULT_CLOCK;
    await this.ctx.storage.put("clock", { ...current, ...clock });
    return true;
  }

  private async doodleFor(me: string, seated: boolean): Promise<RoomView["doodle"]> {
    if (!seated) return null;
    const d = await this.ctx.storage.get<Doodle>("doodle");
    return d ? { cells: d.cells, mine: d.by === me, at: d.at } : null;
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
      catMood: catTold?.mood ?? null,
      catMoodAt: catTold?.at ?? null,
      you: people[me]?.name ?? null,
      them: them?.name ?? null,
      themLastAt: them?.lastSeen ?? null,
      themHereNow: !!them && Date.now() - them.lastSeen < HERE_NOW_MS,
      bothHereNow:
        !!him &&
        !!her &&
        (me === him || me === her) &&
        Date.now() - people[him]!.lastSeen < HERE_NOW_MS &&
        Date.now() - people[her]!.lastSeen < HERE_NOW_MS,
      herLine: seated ? ((await this.ctx.storage.get<Told2>("herLine")) ?? null) : null,
      doodle: await this.doodleFor(me, seated),
      note: youAreHer ? note : null,
      noteDay: seated && !youAreHer ? (note?.day ?? null) : null,
      yourNotes: seated && !youAreHer ? await this.notes() : null,
      ourDay: seated && !youAreHer ? ((await this.ctx.storage.get<OurDay>("ourDay")) ?? null) : null,
      framed: (await this.ctx.storage.get<boolean>("framed")) ?? false,
      shelfDown: (await this.ctx.storage.get<boolean>("shelfDown")) ?? false,
      gift: me === him ? ((await this.ctx.storage.get<Gift>("gift")) ?? null) : null,
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
