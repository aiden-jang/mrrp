/** The contract between the Worker and the web client. */

import type { DiscoveryKey } from "./discoveries.js";

export type Action = "pet" | "brush" | "bring" | "sit" | "photo";

/**
 * Two phrasings, because the two seats read different sentences about the same act.
 *   `past` completes "<visitor> ___", which SHE reads: second person, since the cat is her.
 *   `mine` completes "She'll see that you ___", which HE reads about her.
 * Sharing one string produced "you brushed you".
 */
export const ACTIONS: { id: Action; label: string; past: string; mine: string }[] = [
  { id: "pet", label: "Pet her", past: "petted you", mine: "petted her" },
  { id: "brush", label: "Brush her", past: "brushed you", mine: "brushed her" },
  { id: "bring", label: "Bring her something", past: "brought you something", mine: "brought her something" },
  { id: "sit", label: "Sit with her", past: "sat with you a while", mine: "sat with her" },
  // The one action that leaves something behind. See `framed` on the room view.
  { id: "photo", label: "Take her photo", past: "took a photo of you", mine: "took her photo" },
];

/**
 * What you tell the cat you are. Six, deliberately: enough to feel seen, few enough to tap without
 * choosing. There is no "fine", because "fine" is what you say to get out of the conversation.
 */
export type Mood = "good" | "tired" | "stressed" | "sad" | "lonely" | "bored" | "feral" | "done" | "horny";

/** `said` completes "told the cat they're ___", so it has to read after a plural pronoun. */
export const MOODS: { id: Mood; label: string; said: string }[] = [
  { id: "good", label: "good", said: "having a good one" },
  { id: "tired", label: "tired", said: "tired" },
  { id: "stressed", label: "stressed", said: "stressed" },
  { id: "sad", label: "sad", said: "sad" },
  { id: "lonely", label: "lonely", said: "a bit lonely" },
    { id: "bored", label: "bored", said: "bored" },
  // Blunter registers, because six polite words is a thin vocabulary for a whole relationship.
  { id: "feral", label: "feral", said: "feeling feral" },
  { id: "done", label: "done", said: "completely done with today" },
  { id: "horny", label: "horny", said: "in a mood, and not one of the sad ones" },
];

/** How the cat looks. Set once when the room is made, so she can resemble a real cat. */
export interface Cat {
  name: string;
  fur: string;
  furDk: string;
  belly: string;
  eyes: string;
  tabby: boolean;
}

/**
 * Her day, not the server's. The room stores one timezone and the hour she's usually home, and
 * everything about where the sun is and what the cat is doing follows from those two numbers.
 */
export interface Clock {
  /** IANA zone, e.g. "America/New_York". */
  tz: string;
  /** Local hour she's usually back, 0-23. The cat waits by the door around then. */
  homeHour: number;
}

/**
 * Today's note, and only today's. Tomorrow's text never reaches the browser, which is the whole
 * reason the day index is computed on the server.
 */
export interface Note {
  /** 1-based, so day 1 is the first day. */
  day: number;
  total: number;
  text: string;
  /** True once the list has run out and she's seeing the last one again. */
  final: boolean;
}

export interface Visit {
  at: number;
  who: string;
  action: Action;
}

/** A line she left, and when. Named apart from `Told` because it carries text, not a mood. */
export interface Told2 {
  text: string;
  at: number;
}

/** What one of you told the cat, and when. */
export interface Told {
  mood: Mood;
  at: number;
}

/** One thing the room held onto between this person's visits. Never grows into an inbox. */
export type Arrival =
  | { kind: "action"; at: number; action: Action }
  | { kind: "mood"; at: number; mood: Mood }
  | { kind: "line"; at: number; text: string }
  /*
   * The other seat found one of the room's secrets.
   *
   * `what` is null unless you have found it too. Spoiling it would be worse than saying nothing: the
   * pleasure of these is walking into one, and naming it hands over the answer to something you were
   * going to enjoy discovering. Encoded in the type so a careless render cannot leak it.
   */
  | { kind: "found"; at: number; what: DiscoveryKey | null };

export type Gift = "leaf" | "cap" | "moth";

/** A day in the room's own history worth saying something about. */
export interface Milestone {
  kind: "anniversary" | "first-week" | "first-month";
  /** Whole years, for an anniversary. Zero for the earlier two. */
  years: number;
}

/** The one thing she has come to expect, and how much of her history says so. */
export interface Personality {
  trait: "petted" | "brushed" | "fed" | "accompanied" | "photographed";
  count: number;
}

/**
 * The room, from one seat.
 *
 * The cat is her, so her mood is what the cat looks like to both of you, and the two seats get
 * different halves of the app: she says how she is, he turns up.
 */
export interface RoomView {
  cat: Cat;
  clock: Clock;
  /** You are the one the cat is. Decides which half of the app you get. */
  youAreHer: boolean;
  catMood: Mood | null;
  catMoodAt: number | null;
  you: string | null;
  them: string | null;
  themLastAt: number | null;
  themHereNow: boolean;
  /** Both seats at once. Rare in an asynchronous app, so the room says so out loud. */
  bothHereNow: boolean;
  /** He photographed her, so the picture on the wall is her. The only thing here that accumulates. */
  framed: boolean;
  /** Shared, not per-seat: a box only he could see would be a thing on his screen, not in the room. */
  box: boolean;
  /** The mug is off the shelf. Either of them can put it back. */
  shelfDown: boolean;
  /** Something she left on the floor while he was away. His side only, cleared the moment he acts. */
  gift: Gift | null;
  /** A tiny window light left by the other seat. Touching the window collects it. */
  windowLight: boolean;
  /** Takes his seat back on a new device. Sent to him and nobody else. */
  recoveryCode: string | null;
  /** His side, so he can edit them. She must never receive the ones she has not reached. */
  yourNotes: string[] | null;
  /** One line she left him. Overwritten rather than appended, so there is nothing to keep up with. */
  herLine: Told2 | null;
  /** Her note for today. Null for him: he wrote them. */
  note: Note | null;
  /** Her day number, for his side, without the text. */
  noteDay: number | null;
  /** Her side: what he did, in second person. Empty for him. */
  theirRecent: Visit[];
  /** He turned up after she said something. Not a read receipt: "saw it, did nothing" is worse to know. */
  theyCameAfter: boolean;
  /** New things from the other seat since this person last opened the room. */
  arrivals: Arrival[];
  /**
   * How many of the room's secrets the two of you have noticed between you.
   *
   * Deliberately not "n of m". The total is the spoiler: knowing there are fourteen turns a room you
   * poke at into a list you complete.
   */
  noticed: number;
  waitingForThem: boolean;
  /** Milliseconds since this person's previous visit. Null on their first. */
  awayMs: number | null;
  /** Today is worth mentioning: the room's own anniversary, or its first week or month. Rarely set. */
  milestone: Milestone | null;
  /** What she has come to expect, once there is enough history behind it to mean anything. */
  personality: Personality | null;
}
