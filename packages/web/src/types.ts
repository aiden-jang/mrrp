import type { DiscoveryKey } from "./discoveries.js";

export type Action = "pet" | "brush" | "bring" | "sit" | "photo";

// Two phrasings for the same act, because the two seats read different sentences.
//   `past` finishes "<visitor> ___", which SHE reads.
//   `mine` finishes "She'll see that you ___", which HE reads.
// One shared string gave us "you brushed you".
export const ACTIONS: { id: Action; label: string; past: string; mine: string }[] = [
  { id: "pet", label: "Pet her", past: "petted you", mine: "petted her" },
  { id: "brush", label: "Brush her", past: "brushed you", mine: "brushed her" },
  { id: "bring", label: "Bring her something", past: "brought you something", mine: "brought her something" },
  { id: "sit", label: "Sit with her", past: "sat with you a while", mine: "sat with her" },
  { id: "photo", label: "Take her photo", past: "took a photo of you", mine: "took her photo" },
];

export type Mood = "good" | "tired" | "stressed" | "sad" | "lonely" | "bored" | "feral" | "done" | "horny";

// `said` finishes "told the cat they're ___", so it has to read after a plural pronoun.
export const MOODS: { id: Mood; label: string; said: string }[] = [
  { id: "good", label: "good", said: "having a good one" },
  { id: "tired", label: "tired", said: "tired" },
  { id: "stressed", label: "stressed", said: "stressed" },
  { id: "sad", label: "sad", said: "sad" },
  { id: "lonely", label: "lonely", said: "a bit lonely" },
  { id: "bored", label: "bored", said: "bored" },
  { id: "feral", label: "feral", said: "feeling feral" },
  { id: "done", label: "done", said: "completely done with today" },
  { id: "horny", label: "horny", said: "in a mood, and not one of the sad ones" },
];

export interface Cat {
  name: string;
  fur: string;
  furDk: string;
  belly: string;
  eyes: string;
  tabby: boolean;
}

export interface Clock {
  tz: string;
  homeHour: number;
}

// Today's note and no other. Tomorrow's text never reaches the browser, which is why the day index
// is worked out on the server.
export interface Note {
  day: number;
  total: number;
  text: string;
  final: boolean;
}

export interface Visit {
  at: number;
  who: string;
  action: Action;
}

export interface Told2 {
  text: string;
  at: number;
}

export interface Told {
  mood: Mood;
  at: number;
}

export type Arrival =
  | { kind: "action"; at: number; action: Action }
  | { kind: "mood"; at: number; mood: Mood }
  | { kind: "line"; at: number; text: string }
  | { kind: "drawn"; at: number; cells: string }
  | { kind: "found"; at: number; what: DiscoveryKey | null }
  | { kind: "kept"; at: number; gift: Gift };

export type Gift = "leaf" | "cap" | "moth";

export interface Milestone {
  kind: "anniversary" | "first-week" | "first-month" | "ours";
  years: number;
  label?: string;
}

export interface Personality {
  trait: "petted" | "brushed" | "fed" | "accompanied" | "photographed";
  count: number;
}

export interface RoomView {
  cat: Cat;
  clock: Clock;
  youAreHer: boolean;
  // True only for a browser that used the leave button. It is why the room does not simply seat her
  // again on her next visit, and it is what the client shows the way back on.
  youLeft: boolean;
  // When she can still put her side back, if she can. Null once the week is up or once somebody else
  // has taken the seat she freed.
  undoLeaveUntil: number | null;
  // Only ever sent to the one whose seat is still there, and only while she can still come back.
  theyLeft: { name: string; until: number } | null;
  // The other side of that: who was told, sent only to the person who left. Non-null under exactly
  // the same conditions as `theyLeft`, so neither of them can be told something the other is not.
  theyWereTold: string | null;
  catMood: Mood | null;
  catMoodAt: number | null;
  you: string | null;
  them: string | null;
  themLastAt: number | null;
  themHereNow: boolean;
  bothHereNow: boolean;
  framed: boolean;
  box: boolean;
  brought: boolean;
  brushed: boolean;
  satWith: boolean;
  firstEver: boolean;
  monthsOld: number;
  shelfDown: boolean;
  gift: Gift | null;
  windowLight: boolean;
  seat: string | null;
  linked: boolean;
  recoveryCode: string | null;
  ourDay: { month: number; day: number; label: string } | null;
  yourNotes: string[] | null;
  herLine: Told2 | null;
  doodle: { cells: string; mine: boolean; at: number } | null;
  note: Note | null;
  noteDay: number | null;
  theirRecent: Visit[];
  theyCameAfter: boolean;
  arrivals: Arrival[];
  noticed: number;
  waitingForThem: boolean;
  bothCalledHer: boolean;
  awayMs: number | null;
  milestone: Milestone | null;
  personality: Personality | null;
}
