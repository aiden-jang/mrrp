import type { Sky } from "./weather.js";
import type { BlanketKey } from "./blanket.js";
import type { DiscoveryKey } from "./discoveries.js";
import type { Milestone, Personality } from "./remembers.js";

export type { DiscoveryKey };
export type { Milestone, Personality };

export type Action = "pet" | "brush" | "sit" | "photo";

export const ACTIONS: { id: Action; label: string; past: string; mine: string }[] = [
  { id: "pet", label: "Pet her", past: "petted you", mine: "petted her" },
  { id: "brush", label: "Brush her", past: "brushed you", mine: "brushed her" },
  { id: "sit", label: "Sit with her", past: "sat with you a while", mine: "sat with her" },
  { id: "photo", label: "Take her photo", past: "took a photo of you", mine: "took her photo" },
];

// `past` finishes "<she> ___", which HE reads. `mine` finishes "He'll see that you ___", hers.
export type CatAct = "shelf" | "box" | "gift";

/** Everything the log can hold: his buttons, her cat acts, and what he does from his own panel. */
export type LogAction = Action | CatAct | "leaveout" | "boxout";

export const CAT_ACTS: { id: CatAct; label: string; past: string; mine: string }[] = [
  {
    id: "shelf",
    label: "Knock something off the shelf",
    past: "knocked something off the shelf",
    mine: "knocked something off the shelf",
  },
  { id: "box", label: "Get in the box", past: "got in the box", mine: "got in the box" },
  // Not a button: she picks the gift itself, and this is how that reaches him.
  { id: "gift", label: "Leave him something", past: "left you something", mine: "left him something" },
];

/** What he leaves out for her, mirroring the gift she leaves him. */
export type Treat = "yarn" | "treat" | "catnip";

export interface LeftOut {
  treat: Treat;
  at: number;
}

export const TREATS: { id: Treat; label: string; found: string }[] = [
  { id: "yarn", label: "the yarn", found: "found the yarn you left out" },
  { id: "treat", label: "a treat", found: "found the treat you left out" },
  { id: "catnip", label: "the catnip", found: "got into the catnip you left out" },
];

export type Mood = "good" | "tired" | "stressed" | "sad" | "lonely" | "bored" | "feral" | "done" | "horny";

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

export interface Note {
  day: number;
  total: number;
  text: string;
  final: boolean;
}

export interface Visit {
  at: number;
  who: string;
  action: LogAction;
}

/*
 * Something she left him. These stack; nothing else she leaves does.
 *
 * An answer keeps both `aboutDay` and `about`. He can rewrite his notes whenever he likes, so the
 * index alone would hang her words off a sentence she never read.
 */
export interface Told2 {
  text: string;
  at: number;
  gift?: Gift;
  aboutDay?: number;
  about?: string;
}

export interface Told {
  mood: Mood;
  at: number;
}

export type Arrival =
  | { kind: "action"; at: number; action: LogAction }
  | { kind: "mood"; at: number; mood: Mood }
  | { kind: "line"; at: number; text: string; gift?: Gift; note?: string }
  | { kind: "drawn"; at: number; cells: string }
  | { kind: "found"; at: number; what: DiscoveryKey | null }
  | { kind: "kept"; at: number; gift: Gift }
  | { kind: "took"; at: number; treat: Treat }
  | { kind: "brought"; at: number; treat: Treat }
  | { kind: "first"; at: number; what: FirstKey };

/** Milestones the world hands the room rather than the calendar: first snow, first rain. */
/** `held` is the app's whole thesis happening, so the room remembers the first one. */
export type FirstKey = "snow" | "rain" | "storm" | "held";

export type Gift = "leaf" | "cap" | "moth";

/** Everything either of them has said, for the screen that looks back at it. */
export interface SaidSoFar {
  notes: { day: number; text: string; answers: { text: string; at: number }[] }[];
  /** `about` is set when she answered a note he has since rewritten, so it no longer has a home. */
  lines: { text: string; at: number; gift?: Gift; about?: string }[];
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
  /** Whether there is a box in the room for her to get into. */
  boxOut: boolean;
  /** He is holding on to her at this moment. Hers to see; never his own hand reported back. */
  heldByThem: boolean;
  /** Something they just touched in the room, for a few seconds. Null on their own side. */
  pokedByThem: { what: string; at: number } | null;
  /** You both reached for the same thing at once. Sent to both, which nothing else is. */
  reachedTogether: { what: string; at: number } | null;
  /** What he left out for her, until she opens the room and finds it. Null on his side. */
  forHer: Treat | null;
  // The hour he actually turns up, once the room has watched long enough to disagree with the one
  // he typed. Null while it still only has his word for it.
  expectAt: number | null;
  sky: Sky;
  // What she chose for her bed, or null while the room still has the one it came with.
  blanket: { key: BlanketKey; stripe: boolean } | null;
  windowLight: boolean;
  seat: string | null;
  linked: boolean;
  recoveryCode: string | null;
  ourDay: { month: number; day: number; label: string } | null;
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

export interface Doodle {
  cells: string;
  by: string;
  at: number;
}
