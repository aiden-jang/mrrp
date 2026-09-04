import type { BlanketKey } from "./blanket.js";
import type { DiscoveryKey } from "./discoveries.js";

export type Action = "pet" | "brush" | "sit" | "photo";

// Two of them, because the two seats read different sentences. One shared string gave "you brushed you".
export const ACTIONS = [
  { id: "pet", label: "Pet her", past: "petted you", mine: "petted her" },
  { id: "brush", label: "Brush her", past: "brushed you", mine: "brushed her" },
  { id: "sit", label: "Sit with her", past: "sat with you a while", mine: "sat with her" },
  { id: "photo", label: "Take her photo", past: "took a photo of you", mine: "took her photo" },
] as const satisfies readonly { id: Action; label: string; past: string; mine: string }[];

// Two of them, because the two seats read different sentences. One shared string gave "you brushed you".
export type CatAct = "shelf" | "box" | "gift";

export type LogAction = Action | CatAct | "leaveout" | "boxout";

export const CAT_ACTS = [
  {
    id: "shelf",
    label: "Knock something off the shelf",
    past: "knocked something off the shelf",
    mine: "knocked something off the shelf",
  },
  { id: "box", label: "Get in the box", past: "got in the box", mine: "got in the box" },
  { id: "gift", label: "Leave him something", past: "left you something", mine: "left him something" },
] as const satisfies readonly { id: CatAct; label: string; past: string; mine: string }[];

export type Treat = "yarn" | "treat" | "catnip";

export const TREATS = [
  { id: "yarn", label: "the yarn", found: "found the yarn you left out" },
  { id: "treat", label: "a treat", found: "found the treat you left out" },
  { id: "catnip", label: "the catnip", found: "got into the catnip you left out" },
] as const satisfies readonly { id: Treat; label: string; found: string }[];

export type Mood = "good" | "tired" | "stressed" | "sad" | "lonely" | "bored" | "feral" | "done" | "horny";

export const MOODS = [
  { id: "good", label: "good", said: "having a good one" },
  { id: "tired", label: "tired", said: "tired" },
  { id: "stressed", label: "stressed", said: "stressed" },
  { id: "sad", label: "sad", said: "sad" },
  { id: "lonely", label: "lonely", said: "a bit lonely" },
  { id: "bored", label: "bored", said: "bored" },
  { id: "feral", label: "feral", said: "feeling feral" },
  { id: "done", label: "done", said: "completely done with today" },
  { id: "horny", label: "horny", said: "in a mood, and not one of the sad ones" },
] as const satisfies readonly { id: Mood; label: string; said: string }[];

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

// Something she left him. An answer keeps both `aboutDay` and `about`: he can rewrite his notes
// whenever he likes, and the number alone would hang her words off a sentence she never read.
export const GIFTS = [
  { id: "leaf", label: "a leaf", name: "leaf" },
  { id: "cap", label: "a bottle cap", name: "bottle cap" },
  { id: "moth", label: "a moth", name: "moth" },
] as const satisfies readonly { id: Gift; label: string; name: string }[];

// Both sides hold this number. The browser stops her typing past it and the worker cuts anything
// longer, so if they ever disagree her words are lost and nobody is told.
export const LINE_MAX = 140;

// His notes. Both sides hold these too: the worker cuts a long one and drops everything past the
// hundred and twentieth, and the panel counted them for him without saying either.
export const NOTE_MAX = 280;
export const NOTES_KEPT = 120;

// Every POST body, named once. The browser builds from these, so a misspelled field stops the build
// instead of being quietly dropped in the post.
export interface Bodies {
  act: { me: string; action: Action };
  blanket: { me: string; key: string; stripe: boolean };
  boxout: { me: string; on: boolean };
  /* A field left out means "leave it alone", not "clear it". Same for `dress`. */
  clock: { me: string; tz?: string; homeHour?: number };
  delete: { me: string; name: string };
  draw: { me: string; cells: string };
  dress: {
    me: string;
    name?: string;
    fur?: string;
    furDk?: string;
    belly?: string;
    eyes?: string;
    tabby?: boolean;
  };
  found: { me: string; key: string };
  gift: { me: string; gift: Gift; text?: string };
  heract: { me: string; act: CatAct };
  hold: { me: string; on: boolean };
  leave: { me: string };
  leaveout: { me: string; treat: Treat };
  link: { me: string; on: boolean };
  notes: { me: string; notes: string[] };
  ourday: { me: string; month?: number; day?: number; label: string };
  poke: { me: string; what: string };
  recover: { me: string; code: string };
  release: { me: string };
  say: { me: string; text: string; aboutDay?: number };
  shelf: { me: string };
  settle: { me: string; on: boolean };
  wait: { me: string; on: boolean };
  sit: { me: string; on: boolean };
  tell: { me: string; mood: Mood };
  unsay: { me: string; at: number };
  undelete: { me: string };
  unleave: { me: string };
  "window-light": { me: string };
}

// The same fields as a handler sees them: all optional, because nothing is promised to arrive. This
// is a cast over untrusted JSON and proves nothing. What it buys is one place for the names.
export type Untrusted<K extends keyof Bodies> = Partial<Bodies[K]>;

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
  | { kind: "undrawn"; at: number }
  | { kind: "found"; at: number; what: DiscoveryKey | null }
  | { kind: "kept"; at: number; gift: Gift }
  | { kind: "took"; at: number; treat: Treat }
  | { kind: "brought"; at: number; treat: Treat }
  | { kind: "first"; at: number; what: FirstKey };

export type FirstKey = "snow" | "rain" | "storm" | "held" | "settled";

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

export interface SaidSoFar {
  notes: { day: number; text: string; answers: { text: string; at: number }[] }[];
  total: number;
  lines: { text: string; at: number; gift?: Gift; about?: string }[];
}

export interface RoomView {
  cat: Cat;
  clock: Clock;
  youAreHer: boolean;
  youLeft: boolean;
  undoLeaveUntil: number | null;
  theyLeft: { name: string; until: number } | null;
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
  boxOut: boolean;
  heldByThem: boolean;
  sittingWith: boolean;
  sittingWithYou: boolean;
  settled: boolean;
  waitingAtDoor: boolean;
  pokedByThem: { what: string; at: number } | null;
  reachedTogether: { what: string; at: number } | null;
  forHer: Treat | null;
  expectAt: number | null;
  sky: "clear" | "cloud" | "rain" | "snow";
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
  // He is never shown her note, so `final` never reaches him and the notes could run dry unnoticed.
  sheHasReadAll: boolean;
  notesInAll: number | null;
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
