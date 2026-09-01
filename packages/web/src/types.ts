import type { BlanketKey } from "./blanket.js";
import type { DiscoveryKey } from "./discoveries.js";

export type Action = "pet" | "brush" | "sit" | "photo";

// Two phrasings, because the seats read different sentences. `past` finishes "<visitor> ___" for
// her; `mine` finishes "She'll see that you ___" for him. One shared string gave "you brushed you".
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

// Today's note only. Tomorrow's text must not reach the browser, so the server picks the day.
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
/* The three things she can leave on the floor. `label` carries its article, `name` does not. */
export const GIFTS: { id: Gift; label: string; name: string }[] = [
  { id: "leaf", label: "a leaf", name: "leaf" },
  { id: "cap", label: "a bottle cap", name: "bottle cap" },
  { id: "moth", label: "a moth", name: "moth" },
];

/* What she can leave in one go. Both sides hold it: the browser stops her typing past it and the
   worker cuts anything longer, so a mismatch loses her words without saying so. */
export const LINE_MAX = 140;

/*
 * Every POST body, named once.
 *
 * `send` builds from these, so a field the browser misspells is a compile error rather than a value
 * the worker silently ignores. The worker takes the field names from the same place and keeps its
 * own checks on the values, because these describe what the browser means to send and not what
 * arrived.
 */
export interface Bodies {
  act: { me: string; action: Action };
  blanket: { me: string; key: string; stripe: boolean };
  boxout: { me: string; on: boolean };
  /* Partial: a field left out means "don't change it", not "clear it". Same for `dress`. */
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
  tell: { me: string; mood: Mood };
  undelete: { me: string };
  unleave: { me: string };
  "window-light": { me: string };
}

/*
 * A handler's view of one of those bodies: same field names, all optional, because none of it is
 * guaranteed to arrive. It is a cast over untrusted JSON and not proof of anything, exactly as the
 * hand-written shapes it replaced were. What it buys is that the names come from one place, so the
 * browser cannot send `aboutday` to a worker reading `aboutDay` and have it quietly do nothing.
 */
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
  | { kind: "found"; at: number; what: DiscoveryKey | null }
  | { kind: "kept"; at: number; gift: Gift }
  | { kind: "took"; at: number; treat: Treat }
  | { kind: "brought"; at: number; treat: Treat }
  | { kind: "first"; at: number; what: FirstKey };

/** Milestones the world hands the room rather than the calendar: first snow, first rain. */
/** `held` is the app's whole thesis happening, so the room remembers the first one. */
export type FirstKey = "snow" | "rain" | "storm" | "held";

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

/** Everything either of them has said, for the screen that looks back at it. */
export interface SaidSoFar {
  notes: { day: number; text: string; answers: { text: string; at: number }[] }[];
  /** Everything he has written, not just what she has been handed. */
  total: number;
  /** `about` is set when she answered a note he has since rewritten, so it no longer has a home. */
  lines: { text: string; at: number; gift?: Gift; about?: string }[];
}

export interface RoomView {
  cat: Cat;
  clock: Clock;
  youAreHer: boolean;
  // Set by the leave button. It is why the room does not just seat her again next visit.
  youLeft: boolean;
  // How long she can still undo it. Null once the week is up or someone took the freed seat.
  undoLeaveUntil: number | null;
  // Sent only to the one still seated, and only while she can still come back.
  theyLeft: { name: string; until: number } | null;
  // The mirror, sent only to the one who left. Same conditions as `theyLeft`, so neither seat
  // learns something the other has not.
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
  // The hour he really turns up. Null until the room has watched long enough to disagree with him.
  expectAt: number | null;
  // Weather where she is. "clear" until the room manages to find out.
  sky: "clear" | "cloud" | "rain" | "snow";
  // Her chosen bed, or null while the room still has the default.
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
