import type { BlanketKey } from "./blanket.js";
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

/*
 * The things she does as the cat, chosen rather than rolled.
 *
 * Everything the cat did used to be the room's dice: the shelf came down on an 18% chance when she
 * visited, the box happened once a day on its own. She is the cat, so these are hers to decide, and
 * he finds out the same way she finds out about him -- by the room being different when he opens it.
 *
 * `past` finishes "<she> ___", which HE reads. `mine` finishes "He'll see that you ___", hers.
 */
export type CatAct = "shelf" | "box" | "gift";

export const CAT_ACTS: { id: CatAct; label: string; past: string; mine: string }[] = [
  {
    id: "shelf",
    label: "Knock something off the shelf",
    past: "knocked something off the shelf",
    mine: "knocked something off the shelf",
  },
  { id: "box", label: "Get in the box", past: "got in the box", mine: "got in the box" },
  // Not offered as a button: she picks the gift itself below, and this is how that reaches him.
  { id: "gift", label: "Leave him something", past: "left you something", mine: "left him something" },
];

/*
 * What he leaves out for her, mirroring the gift she leaves him.
 *
 * The room already knows how to draw all three: they were typed easter eggs, animations with no
 * state behind them. Left out on purpose they become the other half of the gift -- she finds it
 * waiting the next time she opens the room, and him being told she took it is the point.
 */
export type Treat = "yarn" | "treat" | "catnip";

export const TREATS: { id: Treat; label: string; found: string }[] = [
  { id: "yarn", label: "the yarn", found: "found the yarn you left out" },
  { id: "treat", label: "a treat", found: "found the treat you left out" },
  { id: "catnip", label: "the catnip", found: "got into the catnip you left out" },
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
  action: Action | CatAct;
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
  | { kind: "action"; at: number; action: Action | CatAct }
  | { kind: "mood"; at: number; mood: Mood }
  | { kind: "line"; at: number; text: string }
  | { kind: "drawn"; at: number; cells: string }
  | { kind: "found"; at: number; what: DiscoveryKey | null }
  | { kind: "kept"; at: number; gift: Gift }
  | { kind: "took"; at: number; treat: Treat }
  | { kind: "brought"; at: number; treat: Treat }
  | { kind: "first"; at: number; what: FirstKey };

/*
 * Things that happen to the room rather than on a date.
 *
 * Every other milestone here is the calendar: a week, a month, an anniversary, the day he marked.
 * These are the ones the world hands you, noted once and then never again, which is the only way a
 * first stays a first.
 */
export type FirstKey = "snow" | "rain" | "storm";

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
  /** What he left out for her, until she opens the room and finds it. Null on his side. */
  forHer: Treat | null;
  // The hour he actually turns up, once the room has watched long enough to disagree with the one
  // he typed. Null while it still only has his word for it.
  expectAt: number | null;
  // What it is doing where she is. "clear" until the room has managed to find out.
  sky: "clear" | "cloud" | "rain" | "snow";
  // What she chose for her bed, or null while the room still has the one it came with.
  blanket: { key: BlanketKey; stripe: boolean } | null;
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
