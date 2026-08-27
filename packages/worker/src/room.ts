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
import { DAY_MS, milestoneFor, personalityFrom, roomStartedAt, tallyFrom, type Tally } from "./remembers.js";

/**
 * Seven by five, matching the hole in the frame the drawing hangs in. Duplicated from the web
 * package rather than shared: this is the number a request is validated against, and validation that
 * imports its bound from the thing being validated is not validation.
 */
const DOODLE_CELLS = 35;

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
 * How long he has to have been away before she leaves something. Eight hours, so it means "he has
 * not been in since yesterday" rather than "he stepped out", and a gift stays a small event.
 */
const GIFT_AFTER_MS = 8 * 60 * 60 * 1000;
/** Authored, not generated. Three things a cat would actually present you with. */
const GIFTS = ["leaf", "cap", "moth"] as const;

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

/** One shared, replaceable glint — never a history, count, or unread obligation. */
interface WindowLight {
  from: string;
  at: number;
}

/**
 * One Durable Object per room, and a room is exactly two people.
 *
 * Deliberately no WebSockets and no simulation tick: the two of you are almost never here at once, so
 * a fetch on page open is enough. Deliberately nothing that can go wrong for the cat either. No
 * hunger, no sadness, no streak. A pet that can be neglected is a chore, not a gift.
 */
export class Room extends DurableObject<Env> {
  /** Read the room as `me` sees it, claiming a seat if one is free. */
  async view(me: string, name: string | null): Promise<RoomView> {
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    const now = Date.now();
    // Capture this before the visit updates it. build() uses the old timestamp to hand back only
    // what the other person left since this seat last opened the door.
    const lastVisit = people[me]?.lastSeen;

    // Seats are claimed by whoever opens the link first and second. No accounts, no invites.
    if (!people[me] && Object.keys(people).length < 2) {
      people[me] = { name: name?.trim().slice(0, 24) || "Someone", firstSeen: now, lastSeen: now, visits: 0 };
    }
    if (people[me]) {
      people[me].lastSeen = now;
      people[me].visits += 1;
      await this.ctx.storage.put("people", people);
    }

    /*
     * She leaves him something: a leaf, a bottle cap, a moth, on the floor when he next opens the room.
     * Worth nothing and not actionable, which is the point.
     *
     * Set on *her* visit, never on his arrival, so it is something she left rather than something the
     * room conjured to greet him. His actions are buttons; this one he can only receive.
     */
    const { him: h, her: hr } = this.roles(people);
    /*
     * Sometimes she knocks the thing off the shelf. The only object here with two states and no owner:
     * either of them can put it back, where everything else is his-to-do or hers-to-do. No timer and
     * no decay, so it sits there until somebody picks it up and nobody has to.
     */
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

    // A photo is the one action with a consequence: it replaces the picture on the wall, for good.
    // It takes the frame back from a drawing too. One frame, and whatever went in last is what is in
    // it: no priority rule to remember and no way to be confused about why the wall did not change.
    if (action === "photo") {
      await this.ctx.storage.put("framed", true);
      await this.ctx.storage.delete("doodle");
    }

    /*
     * Sometimes what he brings is a box. One in three, because a box that arrives on demand is a
     * button rather than a surprise.
     *
     * It lasts her day and no longer: nothing in this room may pile up on her, or it becomes a room
     * she can fall behind on. Keyed to *her* local day, like the notes, so it clears when hers turns.
     */
    if (action === "bring") {
      const clock = (await this.ctx.storage.get<Clock>("clock")) ?? DEFAULT_CLOCK;
      const today = localDayNumber(Date.now(), clock.tz);
      /*
       * Whatever he brought, it is in the room now.
       *
       * Two times in three this action left nothing at all: he pressed a button, she was told he had
       * brought her something, and the room was exactly as it had been. A present that does not exist
       * is a worse gesture than no present. The box is still the rare one; this is the ordinary one.
       */
      if (Math.random() < 1 / 3) await this.ctx.storage.put("boxDay", today);
      else await this.ctx.storage.put("broughtDay", today);
    }

    /*
     * The other two things he does that used to leave nothing.
     *
     * Brushing played a sound and changed the room in no way at all; sitting with her put a second
     * cushion beside her and took it away again the moment he closed the tab. Both last her day, for
     * the same reason the box does, and both are things she finds rather than things she is told.
     */
    if (action === "brush" || action === "sit") {
      const clock = (await this.ctx.storage.get<Clock>("clock")) ?? DEFAULT_CLOCK;
      const key = action === "brush" ? "brushedDay" : "satWithDay";
      await this.ctx.storage.put(key, localDayNumber(Date.now(), clock.tz));
    }

    /*
     * Touching anything counts as picking it up. Gone from the floor, and never a keepsake he can
     * re-read, which would make it an inbox. One timestamp is kept, so she can be told once that the
     * thing she left was taken.
     */
    const onFloor = await this.ctx.storage.get<Gift>("gift");
    if (onFloor) {
      await this.ctx.storage.put("giftKept", { gift: onFloor, at: Date.now() });
    }
    await this.ctx.storage.delete("gift");

    const previous = (await this.ctx.storage.get<Visit[]>("log")) ?? [];

    /*
     * A total that outlives the log's forty entries, which is what her personality is read from.
     *
     * Seed from the log as it was BEFORE this visit, which is why the append happens after. Seeding
     * from a log that already contains the new visit double-counts the first action after deploy, and
     * it is invisible in isolation because it only happens on the one action that also seeds.
     */
    const tally = (await this.ctx.storage.get<Tally>("tally")) ?? tallyFrom(previous);
    tally[action] = (tally[action] ?? 0) + 1;
    await this.ctx.storage.put("tally", tally);

    await this.ctx.storage.put("log", [{ at: Date.now(), who: me, action }, ...previous].slice(0, LOG_KEEP));

    people[me].lastSeen = Date.now();
    await this.ctx.storage.put("people", people);
    return this.build(me, people);
  }

  /**
   * Put the thing back on the shelf. Either seat, unlike everything else here: tidying up after the
   * cat is not a gesture one performs for the other, and letting only him do it would turn a shared
   * room into his room that she visits. Spectators cannot rearrange their furniture.
   */
  async putBack(me: string): Promise<boolean> {
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    const { him, her } = this.roles(people);
    if (me !== him && me !== her) return false;
    await this.ctx.storage.put("shelfDown", false);
    return true;
  }

  /**
   * Pass one small light through the room's window. A seated person leaves one; the other collects it.
   * Only ever one, no text, no counter, so it cannot quietly turn into another inbox to clear.
   */
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

  /**
   * Set her name and colouring. His to set, and checked here rather than by hiding the form: the room
   * link is the only credential this app has, so anyone holding it could otherwise rename her cat.
   */
  async dress(me: string, cat: Partial<Cat>): Promise<boolean> {
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (this.roles(people).him !== me) return false;
    const current = (await this.ctx.storage.get<Cat>("cat")) ?? DEFAULT_CAT;
    await this.ctx.storage.put("cat", { ...current, ...cat });
    return true;
  }

  /**
   * The room's recovery code, minted on first use and kept as-is.
   *
   * Plaintext on purpose. Hashing protects a secret that is reused elsewhere, or one worth more than
   * the data beside it. Neither applies: this code's entire power is "become the first seat of THIS
   * room", and anybody who can read this storage already has the room, the notes and both names.
   * Hashing would only cost him the ability to look it up again from a device he still has.
   *
   * Ambiguous characters are left out so it survives being read aloud or copied off a screen.
   */
  private async recoveryCode(): Promise<string> {
    const existing = await this.ctx.storage.get<string>("recovery");
    if (existing) return existing;
    const A = "abcdefghijkmnpqrstuvwxyz23456789"; // no l, o, 0, 1
    const raw = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => A[b % A.length]).join("");
    const code = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
    await this.ctx.storage.put("recovery", code);
    return code;
  }

  /**
   * Take back the first seat on a new device. Her seat can be freed by him; without this his cannot be
   * recovered at all, so a lost phone leaves the room permanently read-only.
   *
   * Carry the old seat's `firstSeen` over rather than stamping it fresh. Arrival order decides who is
   * who, and a new timestamp would make him the second seat, which is the cat.
   */
  async recoverHisSeat(me: string, code: string): Promise<boolean> {
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    const { him, her } = this.roles(people);
    if (!him) return false;
    // She must not be able to redeem it into holding both seats, which would leave the room with one
    // person and no cat.
    if (me === her) return false;
    if (me === him) return true; // already his; nothing to do and no reason to fail
    const stored = await this.ctx.storage.get<string>("recovery");
    if (!stored || stored !== code.trim().toLowerCase()) return false;

    const old = people[him]!;
    delete people[him];
    people[me] = { ...old, lastSeen: Date.now() };
    await this.ctx.storage.put("people", people);
    const light = await this.ctx.storage.get<WindowLight>("windowLight");
    if (light?.from === him) await this.ctx.storage.put("windowLight", { ...light, from: me });
    return true;
  }

  /** The notes this room runs on: his if he wrote any, otherwise the shipped defaults. */
  private async found(): Promise<FoundLedger> {
    return (await this.ctx.storage.get<FoundLedger>("found")) ?? {};
  }

  /**
   * Record that this seat noticed one of the room's secrets. Seats only: what the two of them have
   * found together is theirs, and a spectator writing into it would put a stranger's finds in the count.
   *
   * Returns true even when already known. The client reports optimistically, and "you already had this"
   * is not worth surfacing to somebody who just found a piano.
   */
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

  /**
   * Replace the notes for this room. His to set. A room nobody has edited falls back to the defaults,
   * so a new room is never a blank page.
   *
   * Her place is kept: if he trims the list below what she has read, clamp the index to the new last
   * one rather than resetting. Losing her progress because he fixed a typo would be indefensible.
   */
  async setNotes(me: string, notes: string[]): Promise<boolean> {
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (this.roles(people).him !== me) return false;

    const clean = notes
      .map((n) => n.trim().slice(0, 280))
      .filter(Boolean)
      .slice(0, 120);
    if (clean.length === 0) {
      // Clearing them means "go back to the defaults", not "she gets nothing".
      await this.ctx.storage.delete("notes");
    } else {
      await this.ctx.storage.put("notes", clean);
      const idx = (await this.ctx.storage.get<number>("noteIdx")) ?? 0;
      if (idx > clean.length - 1) await this.ctx.storage.put("noteIdx", clean.length - 1);
    }
    return true;
  }

  /**
   * Free her seat so a new device can claim it.
   *
   * A seat is a random token in localStorage, which is what makes this account-free. Clearing browser
   * data therefore loses it, and with two seats and no way to release one the room dies permanently.
   * Over months on a home screen that is a matter of time, not an edge case.
   *
   * His to call, like dressing the cat: the link is the only credential, so anybody holding it could
   * otherwise evict her. Her notes progress and her line survive; her mood resets, which is right.
   */
  async releaseHerSeat(me: string): Promise<boolean> {
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    const { him, her } = this.roles(people);
    if (him !== me || !her) return false;

    const moods = (await this.ctx.storage.get<Record<string, Told>>("moods")) ?? {};
    delete moods[her];
    delete people[her];
    await this.ctx.storage.put("people", people);
    await this.ctx.storage.put("moods", moods);
    // The visit log is keyed by person too, and entries for a seat nobody holds would show up as
    // things done by a stranger.
    const log = (await this.ctx.storage.get<Visit[]>("log")) ?? [];
    await this.ctx.storage.put(
      "log",
      log.filter((v) => v.who !== her),
    );
    const light = await this.ctx.storage.get<WindowLight>("windowLight");
    if (light?.from === her) await this.ctx.storage.delete("windowLight");
    return true;
  }

  /**
   * Tell the cat how you are. Stored per person and overwritten, never appended: the moment this keeps
   * a record it stops being a way to say something and becomes a diary you can fall behind on.
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
   * Leave him a line. Hers to write, and only ever one. Replaceable, never appended, like the mood:
   * a log makes this a chat, a chat has unread counts, and unread counts are a thing to keep up with.
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

  /**
   * Put something in the frame. Either seat: it is one wall between the two of them.
   *
   * Validated here as well as at the route, because the route is not the only way in and a cells
   * string is the one thing in this app a person hands us that gets drawn a pixel at a time. A blank
   * sheet is a delete rather than a stored square of nothing, so the frame goes back to its fish.
   */
  async draw(me: string, cells: string): Promise<RoomView> {
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

  /**
   * Fast-forward this room, for looking at states that otherwise take months to reach.
   *
   * Everything interesting about this app happens on a scale nobody can sit through: the personality
   * line needs weeks of history, the boards do not fade for a year, and her spot and the worn patch
   * on the rug are both gated behind the same thing. All of it was unlookable-at, which meant it was
   * unreviewable, which meant it shipped on the strength of arithmetic alone.
   *
   * The room's age is not a stored key. It is the earliest `firstSeen` across the seats, so ageing a
   * room means moving those, which is also why this cannot be done from outside the Durable Object.
   *
   * Reachable on localhost only; see the route.
   */
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
      // The one thing `days` cannot reach: coming back is measured from your own last visit, not from
      // the room's age, and it is the input to five lines of copy that are otherwise unreachable.
      people[me].lastSeen = Date.now() - Math.max(0, want.awayHours) * 60 * 60 * 1000;
      await this.ctx.storage.put("people", people);
    }
    if (want.tally) await this.ctx.storage.put("tally", want.tally);
    if (want.noteIdx !== undefined) {
      const clock = (await this.ctx.storage.get<Clock>("clock")) ?? DEFAULT_CLOCK;
      await this.ctx.storage.put("noteIdx", Math.max(0, want.noteIdx));
      // Or her very next read rolls it forward again and the index you asked for lasts one frame.
      await this.ctx.storage.put("noteReadDay", localDayNumber(Date.now(), clock.tz));
    }
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
   * The index advances when SHE reads one, never by calendar date. Indexing by date means a day she
   * doesn't open the app is a note she never sees, which punishes exactly the behaviour this app
   * promises not to care about. She gets note 2 on her second visit, whenever that is, and never more
   * than one a day.
   *
   * This writes from inside build(), so reading the room is a mutation for her seat. The alternative
   * is a separate "mark read" round trip that could fail after she had already seen it.
   */
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
    /** Whether the viewer holds one of the two seats at all, as opposed to just holding the link. */
    const seated = me === him || me === her;
    const otherId = youAreHer ? him : her;
    const them = otherId ? (people[otherId] ?? null) : null;
    const waitingForThem = !her;
    const windowLight = await this.ctx.storage.get<WindowLight>("windowLight");
    const startedAt = roomStartedAt(
      Object.values(people).map((person) => person.firstSeen),
      Date.now(),
    );

    // A bounded arrival card, not a message history. The timestamp captured before view() updates
    // lastSeen makes this work after a day away and during a live poll alike; the next read is empty.
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
      /*
       * A drawing the other one put up. Both seats, and only theirs: it hangs on the wall where you
       * cannot miss it, but so does her sentence, and that is in here too. Yours is not news to you.
       */
      const hung = await this.ctx.storage.get<Doodle>("doodle");
      if (hung && hung.by !== me && hung.at > since) {
        arrivals.push({ kind: "drawn", at: hung.at, cells: hung.cells });
      }
      /*
       * Secrets the other person found while you were away. Both seats get these, unlike almost
       * everything else in build(): finding something is the one thing either of them does in the
       * same way, so it is the one thing that travels both directions.
       */
      if (otherId) {
        for (const found of arrivalsFor(await this.found(), me, otherId, since)) {
          arrivals.push({ kind: "found", at: found.at, what: found.mutual ? found.key : null });
        }
      }
      /*
       * He took the thing she left. Delivered as an arrival rather than its own field, so it clears on
       * the next read and cannot pile up.
       *
       * The seat check is belt-and-braces while act() stamps his lastSeen after recording this. Reorder
       * those two and it becomes the only thing stopping him being told about his own picking up.
       */
      if (youAreHer) {
        const kept = await this.ctx.storage.get<{ gift: Gift; at: number }>("giftKept");
        if (kept && kept.at > since) arrivals.push({ kind: "kept", at: kept.at, gift: kept.gift });
      }
      arrivals.sort((a, b) => b.at - a.at);
    }

    /*
     * Her mood, for the day she said it and no longer.
     *
     * It used to be cleared in exactly one place: when her seat was released. So a "stressed" tapped
     * three weeks ago was still drawing a stressed cat three weeks later, under a line that offers
     * "hasn't said how she is yet today" as its own alternative. Every other thing in this room that
     * means today is keyed to her local day; this was the one that was not.
     *
     * Derived from the timestamp rather than stored as a day number, so it is right for the moods
     * already in storage and there is no second copy of the same fact to keep in step.
     *
     * The arrival card is deliberately not gated this way: that is a record of what happened while
     * you were out, and it stays true after midnight in a way a current feeling does not.
     */
    /*
     * Her mood, to the two of them and nobody else.
     *
     * It used to go to whoever was looking, on the grounds that the cat is her. But the cat is also
     * the only place the mood is written down, so a forwarded link let a stranger read how she was
     * today off the caption, next to a paragraph telling them this room is not theirs. Every other
     * thing she leaves in here is gated on the seat; a tapped mood is a shorter sentence, not a
     * different kind of one. Spectators get the cat the clock alone would give them.
     */
    const told = seated && her ? (moods[her] ?? null) : null;
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
      // Seated people only, or a third person with the link can read the sentence she left him. She
      // needs it too, to see and edit what she left, so the gate is the seat and not which seat.
      herLine: seated ? ((await this.ctx.storage.get<Told2>("herLine")) ?? null) : null,
      // Same gate as the line, for the same reason: a drawing is a shorter one. `mine` is what lets
      // the frame say whose it is without ever sending the other seat's token to a browser.
      doodle: await this.doodleFor(me, seated),
      // He wrote the notes, so handing them back to him is pointless. He gets the day count only,
      // and a spectator gets nothing: how far into her notes she is is between the two of them.
      note: youAreHer ? note : null,
      noteDay: seated && !youAreHer ? (note?.day ?? null) : null,
      // He wrote them, so handing them back is how he edits them. Never to her, and never to a
      // spectator: that would be the note leak again with extra steps.
      yourNotes: seated && !youAreHer ? await this.notes() : null,
      framed: (await this.ctx.storage.get<boolean>("framed")) ?? false,
      // Not gated: it is a physical object on a floor, and both of them can see a floor.
      shelfDown: (await this.ctx.storage.get<boolean>("shelfDown")) ?? false,
      // His only. Telling her what she left would turn a thing she did into a thing she performed.
      gift: me === him ? ((await this.ctx.storage.get<Gift>("gift")) ?? null) : null,
      // The sender does not see their own glint as something waiting for them. Spectators see no
      // private handoff at all, even though they may look around the rest of the room.
      windowLight: seated && !!windowLight && windowLight.from !== me,
      // Only today's box. An older one is simply not reported, so it needs no cleanup pass.
      box: ((await this.ctx.storage.get<number>("boxDay")) ?? -1) === localDayNumber(Date.now(), clock.tz),
      brought:
        ((await this.ctx.storage.get<number>("broughtDay")) ?? -1) === localDayNumber(Date.now(), clock.tz),
      brushed:
        ((await this.ctx.storage.get<number>("brushedDay")) ?? -1) === localDayNumber(Date.now(), clock.tz),
      satWith:
        ((await this.ctx.storage.get<number>("satWithDay")) ?? -1) === localDayNumber(Date.now(), clock.tz),
      /*
       * The one time she gets to arrive.
       *
       * `visits` is incremented before build() runs, so a seat's very first read arrives here as 1.
       * Seats only: a stranger with the link does not get the room's first moment.
       */
      firstEver: seated && (people[me]?.visits ?? 0) <= 1,
      /* Whole months, floored. The boards do not fade on a schedule anybody is watching. */
      monthsOld: Math.max(0, Math.floor((Date.now() - startedAt) / (DAY_MS * 30))),
      // His only, and readable for as long as he holds the seat. Useless to anybody else: redeeming it
      // requires knowing it, and he is the only one it is ever sent to.
      recoveryCode: seated && !youAreHer ? await this.recoveryCode() : null,
      // Only she sees what was done, because only he does anything.
      theirRecent: youAreHer && him ? log.filter((v) => v.who === him).slice(0, 4) : [],
      theyCameAfter: !!catTold && !!them && youAreHer && them.lastSeen > catTold.at,
      arrivals,
      // Both seats, and spectators get zero: a stranger with the link is not part of "the two of you".
      noticed: seated ? foundCount(await this.found()) : 0,
      /*
       * Both of you have called her by name.
       *
       * The only state in the room that needs both seats rather than either, which is why it is worth
       * having: everything else here is his-to-do or hers-to-do. Nothing announces it; she just starts
       * answering to it now and then.
       */
      bothCalledHer: seated && him && her ? bothFound(await this.found(), "herName", him, her) : false,
      /* `since` is their previous lastSeen, so this is null for a first visit and for a spectator. Null
       * rather than zero: never having been here is different from having just been here. */
      awayMs: since !== undefined ? Math.max(0, Date.now() - since) : null,
      /* Derived from the earliest arrival and the running tally, and answered in her timezone: a day
       * that turns over at UTC midnight is nobody's day. */
      milestone: seated ? milestoneFor(startedAt, Date.now(), clock.tz) : null,
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
