import type { Clock, Mood, RoomView } from "./types.js";
import { RESPONSES, type MoodVisual } from "./moods.js";
import type { Pose } from "./sprites.js";
import { seasonFor } from "./season.js";

export type LightPhase = "night" | "dawn" | "day" | "golden" | "evening";

/**
 * What the room looks like at a given moment of HER day. Every value is picked by hand at an hour
 * that means something, and the hours in between are just a blend of the two nearest. Nothing here
 * is a sun model. See DECISIONS.md.
 */

export interface Scene {
  /** Fractional local hour, 0-24. */
  hour: number;
  /** Authored lighting chapter used for details that should not cross-fade into mush. */
  lightPhase: LightPhase;
  /** 0 at night, 1 at full daylight. Drives the beam and how bright the room reads. */
  sun: number;
  /** Horizontal centre of the sunbeam on the floor, 0-1. Crosses the room over the day. */
  beam: number;
  wallTop: string;
  wallBottom: string;
  floorNear: string;
  floorFar: string;
  beamWarm: string;
  /** Wall and floor inside the shaft of light, and the bright patch on the floor. Solid colours,
   *  so the beam can be filled rather than glazed over what's underneath. */
  litWall: string;
  litFloor: string;
  patch: string;
  /** Where she is, 0-1 across the room. Follows the sun, except when she's waiting. */
  catX: number;
  /** 0 wide awake, 1 fast asleep. */
  sleepy: number;
  /** She's by the door because it's nearly the hour you get home. */
  atDoor: boolean;
  /** One short line about what she's doing. Authored per part of the day, not assembled. */
  doing: string;
  /** 0-1 closeness and warmth, raised by the moods that need holding. */
  snug: number;
  /** 0-1 liveliness. */
  play: number;
  /** She's purring unprompted, because of what you told her. */
  purring: boolean;
  /** Floor on how open her eyes are, regardless of the cursor. 0 leaves it to proximity. */
  eyes: number;
  /** Which pose to draw her in, if what she was told calls for a specific one. */
  pose: Pose | null;
  /**
   * She's actually in her bed. She follows the sunbeam all day, so without this there is nowhere for
   * her to go at night, and the copy says "curled up for the night" over a cat on bare boards.
   */
  inBed: boolean;
  sparkle: boolean;
  /** Material response selected by the mood; null when the room is simply following the clock. */
  moodVisual: MoodVisual | null;
}

/** Local fractional hour in an IANA zone, without pulling in a date library. */
export function hourIn(tz: string, at = Date.now()): number {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(at));
  const h = Number(p.find((x) => x.type === "hour")?.value ?? 12);
  const m = Number(p.find((x) => x.type === "minute")?.value ?? 0);
  return (h % 24) + m / 60;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function lightPhaseAt(hour: number): LightPhase {
  if (hour < 5 || hour >= 22) return "night";
  if (hour < 8) return "dawn";
  if (hour < 17) return "day";
  if (hour < 20) return "golden";
  return "evening";
}

export function mixHex(a: string, b: string, t: number): string {
  const n = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [ar, ag, ab] = n(a),
    [br, bg, bb] = n(b);
  const c = (x: number, y: number) =>
    Math.round(lerp(x, y, t))
      .toString(16)
      .padStart(2, "0");
  return `#${c(ar!, br!)}${c(ag!, bg!)}${c(ab!, bb!)}`;
}

/** Keyframes. Hour, then the look of the room at that hour. */
// prettier-ignore
const KEYS: { h: number; sun: number; beam: number; wall: string; wall2: string; floor: string; floor2: string; warm: string }[] = [
  { h: 0,  sun: 0.00, beam: 0.30, wall: "#4a4560", wall2: "#3e3a52", floor: "#3b3548", floor2: "#4a4258", warm: "#8f9bd6" },
  { h: 5,  sun: 0.04, beam: 0.18, wall: "#6b6178", wall2: "#5a5168", floor: "#514863", floor2: "#615675", warm: "#b7a9d8" },
  { h: 7,  sun: 0.55, beam: 0.16, wall: "#f0dcc4", wall2: "#e6cfb2", floor: "#cfae86", floor2: "#e0c6a4", warm: "#ffe9c0" },
  { h: 11, sun: 0.92, beam: 0.38, wall: "#f6e6cf", wall2: "#eed9bd", floor: "#d8b992", floor2: "#e9d1af", warm: "#fff3d2" },
  { h: 15, sun: 1.00, beam: 0.56, wall: "#efdcc2", wall2: "#e4cdae", floor: "#d3b48d", floor2: "#e3caa8", warm: "#fff0c9" },
  { h: 18, sun: 0.70, beam: 0.74, wall: "#eccfae", wall2: "#dfba94", floor: "#c9a175", floor2: "#dcb890", warm: "#ffd9a0" },
  { h: 20, sun: 0.28, beam: 0.86, wall: "#a98a86", wall2: "#8e7076", floor: "#7d6467", floor2: "#94787b", warm: "#e0a98f" },
  { h: 22, sun: 0.08, beam: 0.40, wall: "#6a6076", wall2: "#584f6a", floor: "#4f4661", floor2: "#5f5473", warm: "#a99ad2" },
  { h: 24, sun: 0.00, beam: 0.30, wall: "#4a4560", wall2: "#3e3a52", floor: "#3b3548", floor2: "#4a4258", warm: "#8f9bd6" },
];

/** Her afternoon nap, and the hour before you're home. Both hand-set, both the point. */
const NAP_FROM = 13,
  NAP_TO = 16;

/** Her bed's centre as a fraction of the 100-wide room. The bed spans grid 13..33. */
const BED_X = 0.23;
// Under the window, which sits at grid 68 of 100. See WIN_X in Cat.tsx.
const WINDOW_X = 0.68;

/**
 * The middle of the rug, and the one place in the room she takes to on her own.
 *
 * She has always had a hardcoded 0.42 for the hours when there is no sunbeam to follow, no bed to be
 * in and nobody due home: a number that meant "somewhere, it does not matter". Once the room has been
 * going long enough to have a habit at all, it matters. See `sceneFor`'s `spot`.
 */
export const HER_SPOT = 0.55;

/*
 * What the line under the room says she is doing.
 *
 * Two of these describe a cat following the sun, and in summer she does the opposite: she lies beside
 * the beam on the cool boards, which is the same instinct pointed the other way. The copy has to
 * agree with where she is actually drawn, or the room is telling you something you can see is untrue.
 */
// `grey` is a closed sky where she is. Three of these lines are about the sun, and on a wet afternoon
// they describe a room that is not there: "moving with the sunbeam" over a floor with no sunbeam on it.
function doingAt(
  hour: number,
  atDoor: boolean,
  sleepy: number,
  homeHour: number,
  summer: boolean,
  grey: boolean,
): string {
  if (atDoor) return "waiting by the door";
  if (hour < 5) return "asleep, and dreaming about something";
  if (hour < 7) return "awake before anyone, watching the window";
  if (hour < 11) return grey ? "up early, with the room still grey" : "in the first bit of sun";
  if (hour >= NAP_FROM && hour < NAP_TO) {
    if (grey) return "asleep on the rug, with nothing to move for";
    return summer
      ? "asleep on the cool boards, out of the sun"
      : "deeply asleep in the best spot in the room";
  }
  if (hour < 13) return "loafing";
  if (hour < homeHour) {
    if (grey) return "in her own spot, with no sun to follow";
    return summer ? "lying just beside the sunbeam" : "moving with the sunbeam, one patch at a time";
  }
  if (hour < 21) return "settled, now that everyone's in";
  return sleepy > 0.6 ? "curled up for the night" : "doing one last lap of the room";
}

/**
 * The room at a moment of her day. Three inputs, ranked: `together` beats mood beats the clock, and
 * all three only ever move the CAT. The light belongs to the clock alone, so a low mood can make the
 * room closer and warmer but never darker.
 */
export function sceneFor(
  clock: Clock,
  at = Date.now(),
  mood: Mood | null = null,
  together = false,
  /**
   * Where she goes when nothing else is claiming her. Null until the room has a habit, which keeps
   * the old drifting 0.42 for a room that is a week old and has not settled into anything yet.
   */
  spot: number | null = null,
  /** What it is doing outside her window, which is the one thing here that is not on a clock. */
  sky: RoomView["sky"] = "clear",
): Scene {
  const hour = hourIn(clock.tz, at);

  let i = 0;
  while (i < KEYS.length - 2 && hour >= KEYS[i + 1]!.h) i++;
  const a = KEYS[i]!,
    b = KEYS[i + 1]!;
  const t = (hour - a.h) / (b.h - a.h);

  const sun = lerp(a.sun, b.sun, t);
  const beam = lerp(a.beam, b.beam, t);
  const lightPhase = lightPhaseAt(hour);
  const wall = mixHex(a.wall, b.wall, t);
  const wall2 = mixHex(a.wall2, b.wall2, t);
  const floor = mixHex(a.floor, b.floor, t);
  const floor2 = mixHex(a.floor2, b.floor2, t);
  const warm = mixHex(a.warm, b.warm, t);
  // Night gets moon color, not a weak beige sunbeam. Golden hour deliberately holds the strongest
  // material lift even as the numeric daylight begins to fall.
  const wallLight = lightPhase === "night" ? 0 : lightPhase === "golden" ? 0.7 : 0.12 + sun * 0.5;
  const floorLight = lightPhase === "night" ? 0 : lightPhase === "golden" ? 0.62 : 0.1 + sun * 0.45;
  const patchLight = lightPhase === "night" ? 0 : lightPhase === "golden" ? 0.82 : 0.16 + sun * 0.6;

  // Waiting starts an hour before she expects you and eases off once you're in.
  const untilHome = clock.homeHour - hour;
  const atDoor = untilHome <= 1 && untilHome > -0.5;

  const napping = hour >= NAP_FROM && hour < NAP_TO;
  /*
   * Bed hours: properly asleep before five, curled up once the evening has gone quiet. Not simply "the
   * sun is down": 5-7am is awake and watching the window, and the hour before you are home is spent
   * at the door. Both are dark and neither is bed.
   */
  const inBed = !atDoor && (hour < 5 || hour >= 21);
  // Cats are awake at dawn whatever the light is doing, and the copy says she's watching the window,
  // so her eyes have to agree with it.
  const dawn = hour >= 5.5 && hour < 7.5;
  const sleepy = atDoor || dawn ? 0.1 : napping ? 1 : Math.max(0, 1 - sun * 1.15);

  const r = mood ? RESPONSES[mood] : null;
  /** The sunless, bedless, nobody-due hours: her own spot if she has one, else the old nowhere. */
  const idle = spot ?? 0.42;
  // The evening hours are hers to have a place in: after he is home, she stops following the sunbeam
  // and goes and sits in her spot. Every other hour is already spoken for (bed, door, or beam), and
  // the line under the room at this hour talks about everyone being in, not about the sun.
  const settledIn = spot !== null && !inBed && !atDoor && hour >= clock.homeHour && hour < 21 ? spot : null;

  /*
   * What the weather does to her day.
   *
   * She spends the daylight hours following the sunbeam across the floor, which is a lovely thing for
   * her to do and a nonsense on a wet Tuesday: the beam is not there, and she was lying in a patch of
   * light that had been drawn faint precisely because the sky is closed.
   *
   * Rain and snow are worth going to look at, so she does. Cloud is not, so she just gives up on the
   * sun and goes to her own spot. Neither overrides being asleep, being at the door, or doing what
   * you told her: the weather is the least important thing in the room, and it should lose to
   * everything else that has an opinion.
   */
  const closed = sky !== "clear";
  const free = !inBed && !atDoor && !r;
  const daylight = sun > 0.15;
  const watching = free && daylight && (sky === "rain" || sky === "snow");
  // Where she goes when there is nothing to follow: her own spot, not a beam that is not there.
  const sunnySpot = closed || !daylight ? idle : beam;

  const scene: Scene = {
    hour,
    lightPhase,
    sun,
    beam,
    wallTop: wall,
    wallBottom: wall2,
    floorFar: floor,
    floorNear: floor2,
    beamWarm: warm,
    litWall: mixHex(wall, warm, wallLight),
    litFloor: mixHex(floor2, warm, floorLight),
    patch: mixHex(floor2, warm, patchLight),
    // She follows the light, unless she is waiting for you, unless you have told her something.
    // Being told outranks the clock, or "bored" still puts her at the door near home time and the
    // copy describes a cat that isn't there.
    // BED_X centres her on the cushion; see BED in sprites.ts, which sits at grid 13..33.
    catX:
      r?.catX ??
      (inBed
        ? BED_X
        : watching
          ? WINDOW_X
          : r
            ? sunnySpot
            : atDoor
              ? 0.19
              : settledIn !== null
                ? settledIn
                : sunnySpot),
    // Awake at the window, and a little heavier than usual under a grey one. Rain is the best sleep
    // there is and she is a cat.
    sleepy: r?.sleepy ?? (watching ? 0.12 : closed && free ? Math.min(1, sleepy + 0.12) : sleepy),
    atDoor: r ? r.catX === 0.19 : atDoor,
    // What she's doing about what you said outranks the time of day. It's the more specific fact.
    doing:
      r?.doing ??
      (watching
        ? sky === "snow"
          ? "at the window, watching the snow come down"
          : "at the window, watching it rain"
        : doingAt(
            hour,
            atDoor,
            sleepy,
            clock.homeHour,
            seasonFor(new Date(at)) === "summer",
            closed && free,
          )),
    snug: r?.snug ?? 0,
    play: r?.play ?? 0,
    purring: r?.purring ?? false,
    eyes: r?.eyes ?? 0,
    pose: r?.pose ?? null,
    // A mood that moves her somewhere else takes her out of the bed with it.
    inBed: inBed && !r?.catX,
    sparkle: r?.sparkle ?? false,
    moodVisual: r?.visual ?? null,
  };

  if (!together) return scene;

  return {
    ...scene,
    // Middle of the room, facing out, so she is between the two of you rather than off at one wall.
    catX: 0.5,
    sleepy: 0.05,
    eyes: 1,
    purring: true,
    pose: "sit",
    // Both of these are places she goes to be alone or to wait for someone who isn't here. Neither
    // survives everyone actually being in.
    atDoor: false,
    inBed: false,
    // Never below whatever the mood asked for: if she's been told something that needs holding, being
    // together should not make the room less close.
    snug: Math.max(scene.snug, 0.5),
    doing: "up, in the middle of the room, purring",
  };
}

/**
 * Her date against yours, when the two disagree.
 *
 * The room runs on her clock and the person reading it runs on their own, and for a few hours a day
 * that is not a detail, it is the whole distance between them. Null when both of you are on the same
 * date, which for two people in one timezone is always: this is for the couple it is actually about.
 */
export function dayApart(clock: Clock, at = Date.now()): "ahead" | "behind" | null {
  // formatToParts rather than parsing a localised date string: the string form is locale-dependent
  // and Date's parser is free to reject it, which is exactly the kind of bug that only shows up on
  // somebody else's phone.
  const there = new Intl.DateTimeFormat("en-GB", {
    timeZone: clock.tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(at));
  const part = (type: string) => Number(there.find((x) => x.type === type)?.value ?? 0);
  const here = new Date(at);
  const theirs = part("year") * 10000 + part("month") * 100 + part("day");
  const yours = here.getFullYear() * 10000 + (here.getMonth() + 1) * 100 + here.getDate();
  if (theirs === yours) return null;
  return theirs > yours ? "ahead" : "behind";
}
