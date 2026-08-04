/** The contract between the Worker and the web client. */

export type Action = "pet" | "brush" | "feed" | "sit";

export const ACTIONS: { id: Action; label: string; past: string }[] = [
  { id: "pet", label: "Pet her", past: "petted her" },
  { id: "brush", label: "Brush her", past: "brushed her" },
  { id: "feed", label: "Feed her", past: "fed her" },
  { id: "sit", label: "Sit with her", past: "sat with her a while" },
];

/**
 * What you tell the cat you are. Six, deliberately: enough to feel seen, few enough to tap without
 * choosing. There is no "fine", because "fine" is what you say to get out of the conversation.
 */
export type Mood = "good" | "tired" | "stressed" | "sad" | "lonely" | "bored";

/** `said` completes "told the cat they're ___", so it has to read after a plural pronoun. */
export const MOODS: { id: Mood; label: string; said: string }[] = [
  { id: "good", label: "good", said: "having a good one" },
  { id: "tired", label: "tired", said: "tired" },
  { id: "stressed", label: "stressed", said: "stressed" },
  { id: "sad", label: "sad", said: "sad" },
  { id: "lonely", label: "lonely", said: "a bit lonely" },
  { id: "bored", label: "bored", said: "bored" },
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

/** What one of you told the cat, and when. */
export interface Told {
  mood: Mood;
  at: number;
}

export interface RoomView {
  cat: Cat;
  clock: Clock;
  /** What YOU told the cat. Drives what she does, because she responds to whoever is here. */
  myMood: Mood | null;
  /** What THEY told the cat. This is the whole reason the other person opens the app. */
  theirMood: Told | null;
  /**
   * They came in after you told the cat. Not a read receipt: it only ever says somebody showed up,
   * never that they saw and ignored you, because that is a worse thing to know than nothing.
   */
  theyCameAfter: boolean;
  /** Today's note, or null before the room has a second person to read it. */
  note: Note | null;
  /** Your own display name, once you've claimed a seat. */
  you: string | null;
  /** The other person's name, if they've been here. */
  them: string | null;
  /** When they were last here, ms epoch. */
  themLastAt: number | null;
  /** They are in the room right now, near enough. Turns "was here" into "is here". */
  themHereNow: boolean;
  /** The last few things THEY did. Yours are not echoed back; that's not the point. */
  theirRecent: Visit[];
  /** True when nobody has taken the second seat yet. */
  waitingForThem: boolean;
}
