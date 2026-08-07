import { DurableObject } from "cloudflare:workers";
import type { Action, Cat, Clock, Gift, Mood, Note, RoomView, Told, Told2, Visit } from "./types.js";
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
/**
 * How long he has to have been away before she leaves something. Eight hours, so it means "he has
 * not been in since yesterday" rather than "he stepped out", and a gift stays a small event.
 */
const GIFT_AFTER_MS = 8 * 60 * 60 * 1000;
/** Authored, not generated. Three things a cat would actually present you with. */
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

    /*
     * She leaves him something.
     *
     * If she has been in the room while he has been away a good while, there is a small thing on
     * the floor when he next opens it. A leaf, a bottle cap, a moth. He cannot do anything with it
     * and it is worth nothing, which is the point: it is the one thing in here that goes from her
     * to him without either of them having to write a word.
     *
     * The inverse of "bring her something", and deliberately not symmetrical with it. His actions
     * are buttons he presses; this one he can only receive. Set on *her* visit rather than on his
     * arrival, so it is genuinely something she left behind rather than something the room
     * conjured to greet him.
     */
    const { him: h, her: hr } = this.roles(people);
    /*
     * Sometimes she knocks the thing off the shelf.
     *
     * The only object in the room with two states and no owner. Either of them can put it back,
     * which makes it the one bit of the room they share a job on rather than trading gestures
     * across: everything else here is his-to-do or hers-to-do.
     *
     * No timer and no decay. It sits on the floor until somebody picks it up, and nobody has to.
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

    // A photo is the one action with a consequence: it replaces the picture on the wall, for good.
    if (action === "photo") await this.ctx.storage.put("framed", true);

    /*
     * Sometimes what he brings is a box, and then there is a box in the room.
     *
     * Not every time, because a box that arrives on demand is a button rather than a surprise, and
     * the joke only works if he cannot make it happen. One in three.
     *
     * It lasts her day and no longer. A box that stayed forever would be the second thing in the
     * room that accumulates, and the rule here is that nothing can pile up on her: a room she has
     * to tidy is a room she can fall behind on. Keyed to *her* local day for the same reason the
     * notes are, so it disappears when her day turns over, not his.
     */
    if (action === "bring" && Math.random() < 1 / 3) {
      const clock = (await this.ctx.storage.get<Clock>("clock")) ?? DEFAULT_CLOCK;
      await this.ctx.storage.put("boxDay", localDayNumber(Date.now(), clock.tz));
    }

    // Touching anything counts as picking it up. It is gone from the floor, not stored anywhere:
    // a keepsake he could re-read would make it an inbox, and this is meant to be a moment.
    await this.ctx.storage.delete("gift");

    const log = (await this.ctx.storage.get<Visit[]>("log")) ?? [];
    log.unshift({ at: Date.now(), who: me, action });
    await this.ctx.storage.put("log", log.slice(0, LOG_KEEP));

    people[me].lastSeen = Date.now();
    await this.ctx.storage.put("people", people);
    return this.build(me, people);
  }

  /**
   * Put the thing back on the shelf.
   *
   * Either seat, unlike everything else in here. Tidying up after the cat is not a gesture one of
   * them performs for the other, it is just a thing that needs doing, and letting only him do it
   * would turn a shared room into his room that she visits. Spectators cannot, because a stranger
   * rearranging their furniture is not charming.
   */
  async putBack(me: string): Promise<boolean> {
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    const { him, her } = this.roles(people);
    if (me !== him && me !== her) return false;
    await this.ctx.storage.put("shelfDown", false);
    return true;
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
   * The room's recovery code, minted on first use and kept as-is.
   *
   * Stored in plaintext on purpose. Hashing a secret protects you in two situations: the plaintext is
   * reused elsewhere (a password), or the store leaks and the secret is worth more than the data beside
   * it. Neither applies. This code's entire power is "become the first seat of THIS room", and anybody
   * who can read this object's storage already has the room, the notes and both names. Hashing would buy
   * nothing and cost the thing that makes it usable: he can look it up again from his own device for as
   * long as he still has one, instead of being told he should have written it down.
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
   * Take back the first seat on a new device.
   *
   * The gap this closes: her seat has had a recovery path for a while, because he can free it. His had
   * none, so losing a phone left the room permanently read-only, with notes he could no longer edit and
   * a cat he could no longer change.
   *
   * The old seat's `firstSeen` is carried over rather than stamped fresh, because arrival order is what
   * decides who is who. A new timestamp would make him the second seat, and the second seat is the cat.
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
    return true;
  }

  /** The notes this room runs on: his if he wrote any, otherwise the shipped defaults. */
  private async notes(): Promise<string[]> {
    const own = await this.ctx.storage.get<string[]>("notes");
    return own && own.length > 0 ? own : NOTES;
  }

  /**
   * Replace the notes for this room.
   *
   * His to set. Until this existed, every room in the app shared one hardcoded array, which meant
   * anybody who was not me opened a gift full of somebody else's specifics. A room nobody has edited
   * still falls back to the defaults, so a new room is never a blank page.
   *
   * Her place is kept. If he trims the list to fewer notes than she has already read, the index is
   * clamped to the new last one rather than reset, because losing her progress because he fixed a typo
   * on note 3 would be indefensible.
   */
  async setNotes(me: string, notes: string[]): Promise<boolean> {
    const people = (await this.ctx.storage.get<Record<string, Person>>("people")) ?? {};
    if (this.roles(people).him !== me) return false;

    const clean = notes.map((n) => n.trim().slice(0, 280)).filter(Boolean).slice(0, 120);
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
   * A seat belongs to a random token in localStorage, which is what keeps this frictionless: no
   * account, no password, no email. The cost is that clearing Safari's data or moving to a new phone
   * loses the seat forever, and with only two seats and no way to release one, the room would be dead
   * with nobody able to be the cat again. For something meant to sit on a home screen for months,
   * that is not an edge case, it is a matter of time.
   *
   * His to call, for the same reason dressing the cat is: the link is the only credential, so anybody
   * holding it could otherwise evict her.
   *
   * What survives on purpose: how far into the notes she has read, and the line she left him. Losing a
   * phone should not cost her three weeks of notes or wipe what she said. Her mood is keyed by person
   * and so it resets, which is right — a mood is how you are now, and the new device will be asked.
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
    await this.ctx.storage.put("log", log.filter((v) => v.who !== her));
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

  private async build(me: string, people: Record<string, Person>): Promise<RoomView> {
    const cat = (await this.ctx.storage.get<Cat>("cat")) ?? DEFAULT_CAT;
    const clock = (await this.ctx.storage.get<Clock>("clock")) ?? DEFAULT_CLOCK;
    const log = (await this.ctx.storage.get<Visit[]>("log")) ?? [];
    const moods = (await this.ctx.storage.get<Record<string, Told>>("moods")) ?? {};
    const { him, her } = this.roles(people);
    const youAreHer = !!her && me === her;
    /** Whether the viewer holds one of the two seats at all, as opposed to just holding the link. */
    const seated = me === him || me === her;
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
      // Seated people only. This used to go to anybody holding the link, which meant a third person
      // who opened it could read the sentence she left him. The note text was gated from the start and
      // this was not, and "one private link between two people" has to mean both directions of it.
      // She needs it too, to see and edit what she left, so the gate is the seat and not the seat's
      // identity.
      herLine: seated ? (await this.ctx.storage.get<Told2>("herLine")) ?? null : null,
      // He wrote the notes, so handing them back to him is pointless. He gets the day count only,
      // and a spectator gets nothing: how far into her notes she is is between the two of them.
      note: youAreHer ? note : null,
      noteDay: seated && !youAreHer ? note?.day ?? null : null,
      // He wrote them, so handing them back is how he edits them. Never to her, and never to a
      // spectator: that would be the note leak again with extra steps.
      yourNotes: seated && !youAreHer ? await this.notes() : null,
      framed: (await this.ctx.storage.get<boolean>("framed")) ?? false,
      // Not gated: it is a physical object on a floor, and both of them can see a floor.
      shelfDown: (await this.ctx.storage.get<boolean>("shelfDown")) ?? false,
      // His only. Telling her what she left would turn a thing she did into a thing she performed.
      gift: me === him ? ((await this.ctx.storage.get<Gift>("gift")) ?? null) : null,
      // Only today's box. An older one is simply not reported, so it needs no cleanup pass.
      box: ((await this.ctx.storage.get<number>("boxDay")) ?? -1) === localDayNumber(Date.now(), clock.tz),
      // His only, and readable for as long as he holds the seat. Useless to anybody else: redeeming it
      // requires knowing it, and he is the only one it is ever sent to.
      recoveryCode: seated && !youAreHer ? await this.recoveryCode() : null,
      // Only she sees what was done, because only he does anything.
      theirRecent: youAreHer && him ? log.filter((v) => v.who === him).slice(0, 4) : [],
      theyCameAfter: !!catTold && !!them && youAreHer && them.lastSeen > catTold.at,
      waitingForThem,
    };
  }
}
