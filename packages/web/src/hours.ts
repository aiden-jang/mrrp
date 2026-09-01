// What the room looks like at each hour of HER day. Hand-picked at the hours that mean something,
// blended in between. Nothing here is a sun model. See DECISIONS.md.
import type { Clock, Mood, RoomView } from "./types.js";
import { RESPONSES, type MoodVisual } from "./moods.js";
import type { Pose } from "./sprites.js";
import { seasonFor } from "./season.js";

export type LightPhase = "night" | "dawn" | "day" | "golden" | "evening";

export interface Scene {
  hour: number;
  lightPhase: LightPhase;
  sun: number;
  beam: number;
  wallTop: string;
  wallBottom: string;
  floorNear: string;
  floorFar: string;
  beamWarm: string;
  litWall: string;
  litFloor: string;
  patch: string;
  catX: number;
  sleepy: number;
  atDoor: boolean;
  doing: string;
  /** What she reads, where `doing` names the reader. See moods.ts. */
  doingHers?: string;
  snug: number;
  play: number;
  purring: boolean;
  eyes: number;
  pose: Pose | null;
  inBed: boolean;
  sparkle: boolean;
  moodVisual: MoodVisual | null;
}

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

const NAP_FROM = 13,
  NAP_TO = 16;

const BED_X = 0.23;
const WINDOW_X = 0.68;

export const HER_SPOT = 0.55;
/* Where she stands when she is waiting for him. A mood that puts her here counts as at the door. */
export const DOOR_X = 0.19;

// `grey` is a closed sky: three of these lines are about the sun, and on a wet afternoon they
// describe a room that is not there.
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
    if (grey) return "in the usual spot, with no sun to follow";
    return summer ? "lying just beside the sunbeam" : "moving with the sunbeam, one patch at a time";
  }
  if (hour < 21) return "settled, now that everyone's in";
  return sleepy > 0.6 ? "curled up for the night" : "doing one last lap of the room";
}

export function sceneFor(
  clock: Clock,
  at = Date.now(),
  mood: Mood | null = null,
  together = false,
  spot: number | null = null,
  sky: RoomView["sky"] = "clear",
  expectAt: number | null = null,
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
  const wallLight = lightPhase === "night" ? 0 : lightPhase === "golden" ? 0.7 : 0.12 + sun * 0.5;
  const floorLight = lightPhase === "night" ? 0 : lightPhase === "golden" ? 0.62 : 0.1 + sun * 0.45;
  const patchLight = lightPhase === "night" ? 0 : lightPhase === "golden" ? 0.82 : 0.16 + sun * 0.6;

  // The watched hour beats the typed one after a fortnight. What he typed was true when he typed it.
  const homeHour = expectAt ?? clock.homeHour;
  const untilHome = homeHour - hour;
  const atDoor = untilHome <= 1 && untilHome > -0.5;

  const napping = hour >= NAP_FROM && hour < NAP_TO;
  // Not just "the sun is down": 5-7am is awake at the window and the hour before he is home is
  // spent at the door. Both are dark and neither is bed.
  const inBed = !atDoor && (hour < 5 || hour >= 21);
  const dawn = hour >= 5.5 && hour < 7.5;
  const sleepy = atDoor || dawn ? 0.1 : napping ? 1 : Math.max(0, 1 - sun * 1.15);

  const r = mood ? RESPONSES[mood] : null;
  const idle = spot ?? 0.42;
  const settledIn = spot !== null && !inBed && !atDoor && hour >= homeHour && hour < 21 ? spot : null;

  // Weather comes last, after sleep, the door, and anything you told her to do. Without this she
  // follows the sunbeam through a downpour, lying in light the rain already dimmed away.
  const closed = sky !== "clear";
  const free = !inBed && !atDoor && !r;
  const daylight = sun > 0.15;
  const watching = free && daylight && (sky === "rain" || sky === "snow");
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
    catX:
      r?.catX ??
      (inBed
        ? BED_X
        : watching
          ? WINDOW_X
          : r
            ? sunnySpot
            : atDoor
              ? DOOR_X
              : settledIn !== null
                ? settledIn
                : sunnySpot),
    sleepy: r?.sleepy ?? (watching ? 0.12 : closed && free ? Math.min(1, sleepy + 0.12) : sleepy),
    atDoor: r ? r.catX === DOOR_X : atDoor,
    doingHers: r?.doingHers,
    doing:
      r?.doing ??
      (watching
        ? sky === "snow"
          ? "at the window, watching the snow come down"
          : "at the window, watching it rain"
        : doingAt(hour, atDoor, sleepy, homeHour, seasonFor(new Date(at)) === "summer", closed && free)),
    snug: r?.snug ?? 0,
    play: r?.play ?? 0,
    purring: r?.purring ?? false,
    eyes: r?.eyes ?? 0,
    pose: r?.pose ?? null,
    inBed: inBed && !r?.catX,
    sparkle: r?.sparkle ?? false,
    moodVisual: r?.visual ?? null,
  };

  if (!together) return scene;

  return {
    ...scene,
    catX: 0.5,
    sleepy: 0.05,
    eyes: 1,
    purring: true,
    pose: "sit",
    atDoor: false,
    inBed: false,
    snug: Math.max(scene.snug, 0.5),
    doing: "up, in the middle of the room, purring",
  };
}

export function dayApart(clock: Clock, at = Date.now()): "ahead" | "behind" | null {
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
