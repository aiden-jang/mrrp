import type { Clock, Mood } from "./types.js";
import { RESPONSES } from "./moods.js";

/**
 * What the room looks like at a given moment of HER day.
 *
 * Nothing here is simulated or generated. Every value is a hand-picked keyframe at an hour that
 * means something (first light, mid-afternoon nap, the hour she gets home, late night) and the
 * in-between is a straight interpolation. That's on purpose: a room whose light is computed from a
 * solar model looks correct and feels like nothing. A room where somebody decided 3pm should be the
 * warmest moment of the day feels like somebody decided it.
 */

export interface Scene {
  /** Fractional local hour, 0-24. */
  hour: number;
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

export function mixHex(a: string, b: string, t: number): string {
  const n = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [ar, ag, ab] = n(a), [br, bg, bb] = n(b);
  const c = (x: number, y: number) => Math.round(lerp(x, y, t)).toString(16).padStart(2, "0");
  return `#${c(ar!, br!)}${c(ag!, bg!)}${c(ab!, bb!)}`;
}

/** Keyframes. Hour, then the look of the room at that hour. */
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
const NAP_FROM = 13, NAP_TO = 16;

function doingAt(hour: number, atDoor: boolean, sleepy: number, homeHour: number): string {
  if (atDoor) return "waiting by the door";
  if (hour < 5) return "asleep, and dreaming about something";
  if (hour < 7) return "awake before anyone, watching the window";
  if (hour < 11) return "in the first bit of sun";
  if (hour >= NAP_FROM && hour < NAP_TO) return "deeply asleep in the best spot in the room";
  if (hour < 13) return "loafing";
  if (hour < homeHour) return "moving with the sunbeam, one patch at a time";
  if (hour < 21) return "settled, now that everyone's in";
  return sleepy > 0.6 ? "curled up for the night" : "doing one last lap of the room";
}

/**
 * The room at a moment of her day, then bent by what she told the cat.
 *
 * The split matters: the CLOCK owns the light, and the MOOD owns the cat. A low mood must never be
 * able to make the room dark, only closer and warmer, so mood is deliberately not allowed to touch
 * `sun` or the palette keyframes.
 */
export function sceneFor(clock: Clock, at = Date.now(), mood: Mood | null = null): Scene {
  const hour = hourIn(clock.tz, at);

  let i = 0;
  while (i < KEYS.length - 2 && hour >= KEYS[i + 1]!.h) i++;
  const a = KEYS[i]!, b = KEYS[i + 1]!;
  const t = (hour - a.h) / (b.h - a.h);

  const sun = lerp(a.sun, b.sun, t);
  const beam = lerp(a.beam, b.beam, t);

  // Waiting starts an hour before she expects you and eases off once you're in.
  const untilHome = clock.homeHour - hour;
  const atDoor = untilHome <= 1 && untilHome > -0.5;

  const napping = hour >= NAP_FROM && hour < NAP_TO;
  // Cats are awake at dawn whatever the light is doing, and the copy says she's watching the window,
  // so her eyes have to agree with it.
  const dawn = hour >= 5.5 && hour < 7.5;
  const sleepy = atDoor || dawn ? 0.1 : napping ? 1 : Math.max(0, 1 - sun * 1.15);

  const r = mood ? RESPONSES[mood] : null;

  return {
    hour,
    sun,
    beam,
    wallTop: mixHex(a.wall, b.wall, t),
    wallBottom: mixHex(a.wall2, b.wall2, t),
    floorFar: mixHex(a.floor, b.floor, t),
    floorNear: mixHex(a.floor2, b.floor2, t),
    beamWarm: mixHex(a.warm, b.warm, t),
    litWall: mixHex(mixHex(a.wall, b.wall, t), mixHex(a.warm, b.warm, t), 0.22 + sun * 0.5),
    litFloor: mixHex(mixHex(a.floor2, b.floor2, t), mixHex(a.warm, b.warm, t), 0.2 + sun * 0.45),
    patch: mixHex(mixHex(a.floor2, b.floor2, t), mixHex(a.warm, b.warm, t), 0.3 + sun * 0.6),
    // She follows the light, except when she's waiting for you, which beats the light, except when
    // you've told her something, which beats both.
    // Once she has been told something, that outranks the clock. Otherwise "bored" could still put
    // her at the door because it happens to be nearly home time, and the copy would be describing a
    // cat that isn't there.
    catX: r?.catX ?? (r ? (sun > 0.15 ? beam : 0.42) : atDoor ? 0.19 : sun > 0.15 ? beam : 0.42),
    sleepy: r?.sleepy ?? sleepy,
    atDoor: r ? r.catX === 0.19 : atDoor,
    // What she's doing about what you said outranks the time of day. It's the more specific fact.
    doing: r?.doing ?? doingAt(hour, atDoor, sleepy, clock.homeHour),
    snug: r?.snug ?? 0,
    play: r?.play ?? 0,
    purring: r?.purring ?? false,
    eyes: r?.eyes ?? 0,
  };
}
