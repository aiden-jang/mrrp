/** The contract between the Worker and the web client. */

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

/**
 * The room, from one seat.
 *
 * The cat IS her. So her mood is what the cat looks like, to both of you, and the two seats do
 * different things: she says how she is, he turns up. That asymmetry is the gift, not a shortcoming.
 */
export interface RoomView {
  cat: Cat;
  clock: Clock;
  /** True if you're the one the cat is. Decides which half of the app you get. */
  youAreHer: boolean;
  /** Her mood. This is what the cat looks like, whoever is looking. */
  catMood: Mood | null;
  catMoodAt: number | null;
  /** Your own display name, once you've claimed a seat. */
  you: string | null;
  /** The other person's name. */
  them: string | null;
  /** When they were last here, ms epoch. */
  themLastAt: number | null;
  /** They're in the room right now, near enough. */
  themHereNow: boolean;
  /**
   * You are both in the room at the same moment. Rare, by the nature of an asynchronous app, which is
   * exactly why it is worth saying out loud when it happens.
   */
  bothHereNow: boolean;
  /**
   * This room's notes, so he can edit them. His side only: she must never receive the ones she has
   * not reached, which is the same rule that keeps `note` to a single day's text.
   */
  /**
   * He has taken a photo of her, so the picture on the wall is her instead of the fish it ships with.
   *
   * The only thing in the room that accumulates. Everything else is deliberately stateless, but a frame
   * that changes once gives the room a sense that time has passed in it without creating anything that
   * can be neglected.
   */
  framed: boolean;
  yourNotes: string[] | null;
  /**
   * One line she left him, replaceable and never kept in history.
   *
   * The app was one-directional: he writes thirty notes, she taps one of six moods. Six words is a
   * small vocabulary for the person the whole thing is about, so she gets a sentence too. Overwritten
   * rather than appended, like the mood, so there is nothing to keep up with and nothing to scroll back
   * through.
   */
  herLine: Told2 | null;
  /** Her note for today. Null for him: he wrote them, so reading them back is not the point. */
  note: Note | null;
  /** Which day she's on, for his side, without the text. */
  noteDay: number | null;
  /** Her side: what he did, in second person. His side: empty, because she doesn't do things here. */
  theirRecent: Visit[];
  /**
   * Her side: he came in after she said something. Not a read receipt, only ever that he turned up,
   * because "he saw it and did nothing" is worse to know than nothing.
   */
  theyCameAfter: boolean;
  /** True when the second seat is still empty. */
  waitingForThem: boolean;
}
