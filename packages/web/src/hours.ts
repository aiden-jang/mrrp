import type { Clock, Mood } from "./types.js";
import { RESPONSES } from "./moods.js";
import type { Pose } from "./sprites.js";

export type LightPhase = "night" | "dawn" | "day" | "golden" | "evening";

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
   * She's actually in her bed.
   *
   * The bed used to be scenery she never touched, and the copy was already lying about it: at night
   * the room says "curled up for the night" while she loafed on bare boards in the middle of the
   * floor. She follows the sunbeam all day, and then at night there was nowhere for her to go.
   */
  inBed: boolean;
  sparkle: boolean;
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

/** Her bed's centre as a fraction of the 100-wide room. The bed spans grid 13..33. */
const BED_X = 0.23;

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
 * The room at a moment of her day.
 *
 * Three inputs, ranked: `together` beats mood beats the clock. All three only ever move the CAT.
 * The light belongs to the clock alone, so a low mood can make the room closer and warmer but never
 * darker, and two people being in a room does not move the sun.
 */
export function sceneFor(
  clock: Clock,
  at = Date.now(),
  mood: Mood | null = null,
  together = false,
): Scene {
  const hour = hourIn(clock.tz, at);

  let i = 0;
  while (i < KEYS.length - 2 && hour >= KEYS[i + 1]!.h) i++;
  const a = KEYS[i]!, b = KEYS[i + 1]!;
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
   * Bed hours: properly asleep before five, and curled up once the evening has gone quiet.
   *
   * Not simply "the sun is down". The 5-7am window is "awake before anyone, watching the window",
   * which is a cat that got up, and the hour before you are home is spent at the door. Both are
   * dark and neither is bed.
   */
  const inBed = !atDoor && (hour < 5 || hour >= 21);
  // Cats are awake at dawn whatever the light is doing, and the copy says she's watching the window,
  // so her eyes have to agree with it.
  const dawn = hour >= 5.5 && hour < 7.5;
  const sleepy = atDoor || dawn ? 0.1 : napping ? 1 : Math.max(0, 1 - sun * 1.15);

  const r = mood ? RESPONSES[mood] : null;

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
    // She follows the light, except when she's waiting for you, which beats the light, except when
    // you've told her something, which beats both.
    // Once she has been told something, that outranks the clock. Otherwise "bored" could still put
    // her at the door because it happens to be nearly home time, and the copy would be describing a
    // cat that isn't there.
    // BED_X centres her on the cushion; see BED in sprites.ts, which sits at grid 13..33.
    catX: r?.catX ?? (inBed ? BED_X : r ? (sun > 0.15 ? beam : 0.42) : atDoor ? 0.19 : sun > 0.15 ? beam : 0.42),
    sleepy: r?.sleepy ?? sleepy,
    atDoor: r ? r.catX === 0.19 : atDoor,
    // What she's doing about what you said outranks the time of day. It's the more specific fact.
    doing: r?.doing ?? doingAt(hour, atDoor, sleepy, clock.homeHour),
    snug: r?.snug ?? 0,
    play: r?.play ?? 0,
    purring: r?.purring ?? false,
    eyes: r?.eyes ?? 0,
    pose: r?.pose ?? null,
    // A mood that moves her somewhere else takes her out of the bed with it.
    inBed: inBed && !r?.catX,
    sparkle: r?.sparkle ?? false,
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
