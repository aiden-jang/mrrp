import { useEffect, useRef } from "react";
import type { Cat as CatLook, Clock, Gift, Mood } from "./types.js";
import { mixHex, sceneFor } from "./hours.js";
import { fireflyAt, mothAt, MOTH_CYCLE_MS } from "./critters.js";
import { play, playPianoNote, setVoice } from "./sound.js";
import { dreamOf, type Dream, type DreamContext, type DreamScene } from "./dreams.js";
import { catCallCode } from "./secrets.js";
import { moonPhase, moonPixelLit } from "./moon.js";
import { cellAt, DOODLE_INK } from "./doodle.js";
import { blanketPalette } from "./blanket.js";
import type { RoomView } from "./types.js";
import { seasonFor, seasonalPlantColors } from "./season.js";
import { mouseRunAt } from "./mouse.js";
import { BUBBLE_GAME_MS, bubbleMomentAt, bubbleSeeds, type BubbleSeed } from "./bubbles.js";
import { PIANO_CODE, PIANO_MS, advancePawMelody, pianoKeyAt, pianoKeys } from "./piano.js";
import {
  collectConstellationStar,
  constellationProgress,
  CONSTELLATION_KEYS,
  type ConstellationKey,
} from "./constellation.js";
import type { DiscoveryKey } from "./discoveries.js";
import {
  BED,
  BIRD,
  BROUGHT,
  BOX_BACK,
  BOX_FRONT,
  CAKE,
  DOOR,
  EK,
  DOOR_FRAMES,
  GIFT_CAP,
  GIFT_LEAF,
  GIFT_MOTH,
  MUG,
  MUG_DOWN,
  FRAME,
  FRAME_CAT,
  FRAME_EMPTY,
  FRAME_HOLE,
  MRRP,
  PLANT,
  POSES,
  SHELF,
  TAIL,
  TUFT,
  WINDOW,
  type Pose,
  type Sprite,
} from "./sprites.js";

const GW = 100,
  GH = 80,
  FLOOR = 48;
const VW = 80;
// `kx` is where she is anchored, not her left edge, and `ox` is negative. Measure reach from the
// poses or she gets drawn through the wall.
const CAT_REACH_LEFT = Math.max(...Object.values(POSES).map((p) => -p.ox));
const CAT_REACH_RIGHT = Math.max(...Object.values(POSES).map((p) => p.ox + p.w));
const WIN_X = 60,
  WIN_CX = WIN_X + 8;
const BOX_X = 44,
  BOX_Y = FLOOR + 9;
const ZOOM_MS = 1600;
const BIRD_MS = 5200;
const SUN_CATCHER_MS = 3200;
const STAR_MS = 900;
const CONSTELLATION_MS = 6200;
const WINDOW_LIGHT_SEND_MS = 1900;
const LEAF_FALL_MS = 1200;
const PHOTO_GLINT_MS = 700;
const PHOTO_MEMORY_MS = 2200;
const MUG_STEAM_MS = 2200;
const MUG_GLOW_MS = 2600;
const GIFT_WISH_MS = 2800;
const BED_DREAM_MS = 3200;
const BED_STRIPES = [5, 8, 11, 14];
// Four streaks and four flakes, placed by hand across the two panes, each starting at a different
// point in its fall so they never come down in step.
const RAIN_STREAKS: [number, number][] = [
  [2, 0],
  [6, 0.45],
  [10, 0.2],
  [14, 0.7],
];
const SNOW_FLAKES: [number, number][] = [
  [3, 0],
  [7, 0.55],
  [11, 0.3],
  [14, 0.8],
];
const PURR_CHORUS_MS = 2600;
const LASER_CHASE_MS = 2800;
const LASER_RELEASE_MS = 900;
const ROOM_TOUR_MS = 4200;
const ROOM_TOUR_KEYS = ["window", "frame", "shelf", "door", "plant", "bed"] as const;
const AURORA_MS = 5600;
const ROOM_CODE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
];
const TYPED_ROOM_CODE = "mrrp";
const SUMMON_CODE = "pspsps";
const SUMMON_MS = 5200;
const BOX_CODE = "box";
const SECRET_BOX_MS = 8200;
const YARN_CODE = "yarn";
const YARN_MS = 5200;
const TREAT_CODE = "treat";
const TREAT_MS = 5600;
const TREAT_X = 68;
const CATNIP_CODE = "catnip";
const CATNIP_MS = 6200;
const CATNIP_X = 54;
const MUSIC_CODE = "music";
const MUSIC_MS = 5600;
const MOUSE_CODE = "mouse";
const MOUSE_MS = 7000;
const BUBBLE_CODE = "bubbles";
const BUBBLE_REWARD_MS = 2400;
const PIANO_REWARD_MS = 4200;
const STARS_CODE = "stars";
const CONSTELLATION_REWARD_MS = 7200;
const STAR_FLIGHT_MS = 1300;
const NAME_CALL_MS = 6200;
const BOX_PLAY_MS = 2800;
const SLOW_BLINK_WAIT_MS = 1800;
const SLOW_BLINK_MS = 850;
const STEP_FADE_MS = 4200;
const LEAVING_WARMTH = 9;
const SUMMER_SHADE = 16;
const RAIN_MS = 6800;
const RAINBOW_MS = 2600;
const PLANT_BLOOM_MS = 3800;
const DOOR_NOTE_MS = 3600;
const PAW_CURSOR =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="-1 -2 26 26">' +
      '<g fill="none" stroke="#fffdf6" stroke-width="2.4">' +
      '<ellipse cx="4" cy="5" rx="2.6" ry="3"/><ellipse cx="10" cy="3" rx="2.8" ry="3.2"/>' +
      '<ellipse cx="16" cy="5" rx="2.6" ry="3"/><ellipse cx="20.5" cy="10" rx="2.2" ry="2.5"/>' +
      '<ellipse cx="11" cy="15" rx="7.5" ry="5.8"/></g>' +
      '<g fill="#4a3520">' +
      '<ellipse cx="4" cy="5" rx="2.6" ry="3"/><ellipse cx="10" cy="3" rx="2.8" ry="3.2"/>' +
      '<ellipse cx="16" cy="5" rx="2.6" ry="3"/><ellipse cx="20.5" cy="10" rx="2.2" ry="2.5"/>' +
      '<ellipse cx="11" cy="15" rx="7.5" ry="5.8"/></g></svg>',
  );

const ROOM_RESERVE = 270;
const ROOM_MAX_SHARE = 0.78;

// prettier-ignore
// One row out and the collar reads as a second mouth. These came off the grids in sprites.ts with a
// script, not by eye. `flop` is the odd one: she is lying on her side, so the band is two pixels at
// the neck seen edge-on rather than twelve across a chest that is not facing you.
const COLLAR: Record<Pose, { dx: number; w: number; dy: number; tag: number }> = {
  loaf:    { dx: -8, w: 12, dy: -7, tag: -2 },
  sit:     { dx: -6, w: 12, dy: -9, tag:  0 },
  stand:   { dx: -6, w: 12, dy: -7, tag:  0 },
  play:    { dx: -7, w: 12, dy: -9, tag: -1 },
  perk:    { dx: -6, w: 12, dy: -9, tag:  0 },
  walk:    { dx: -6, w: 12, dy: -7, tag:  0 },
  stretch: { dx: -6, w: 12, dy: -5, tag:  0 },
  pounce:  { dx: -7, w: 12, dy: -6, tag: -1 },
  peek:    { dx: -4, w:  8, dy: -2, tag:  0 },
  flop:    { dx:  5, w:  2, dy: -6, tag:  5 },
};
const COLLAR_BAND = "#9c5468";
const COLLAR_TAG = "#e8ad55";

const FRAME_CENTRE = 22;
const GLANCE_MS = 2600;

const DOOR_CENTRE = 12;
const SWIPE_MS = 620;
const WATCH_DOOR_MS = 7000;
// Not under the shelf. The camera shows 80 of the room's 100 columns, so a mug that lands at 80 is
// never seen.
const MUG_FLOOR_X = 66,
  MUG_FLOOR_Y = FLOOR + 14;

const PROP_LABELS: Record<string, string> = {
  window: "the window",
  frame: "the picture on the wall",
  shelf: "the shelf",
  door: "the door",
  plant: "the plant",
  bed: "her bed",
  box: "the box",
};

// One table for drawing and for hit-testing, so the two cannot disagree. Every sprite has a zero
// offset except BED, whose ox is -11, so its box starts left of where it is drawn.
const PROPS = [
  { key: "window", sp: WINDOW, x: WIN_X, y: 4 },
  { key: "frame", sp: FRAME, x: 16, y: 12 },
  { key: "shelf", sp: SHELF, x: 80, y: FLOOR - 24 },
  { key: "door", sp: DOOR, x: 6, y: FLOOR - 16 },
  { key: "plant", sp: PLANT, x: 87, y: FLOOR - 13 },
  { key: "bed", sp: BED, x: 24 - 11, y: FLOOR + 22 },
  { key: "box", sp: BOX_BACK, x: BOX_X, y: BOX_Y },
] as const;

const INK = "#4a3520";
const PINK = "#e79ba3";
const BLUSH = "#f0aeb4";
const WHITE = "#fffdf6";

// Shut eyes are drawn as lines, not as recoloured open eyes. The `e` role covers two or three pixels
// so an open eye can hold a highlight; filling all of it brown reads as sunglasses.
const CLOSED_EYES: Record<Pose, { y: number; left: number; right: number; width: number }> = {
  flop: { y: 7, left: 5, right: 11, width: 2 },
  loaf: { y: 7, left: 5, right: 11, width: 2 },
  sit: { y: 7, left: 5, right: 11, width: 2 },
  stand: { y: 7, left: 5, right: 11, width: 2 },
  play: { y: 7, left: 5, right: 11, width: 2 },
  perk: { y: 8, left: 5, right: 11, width: 2 },
  walk: { y: 7, left: 5, right: 11, width: 2 },
  stretch: { y: 7, left: 5, right: 11, width: 2 },
  pounce: { y: 7, left: 5, right: 11, width: 2 },
  peek: { y: 7, left: 5, right: 11, width: 2 },
};

const YAWN = { y: 9, x: 6, w: 5 };
const YAWN_MS = 900;

/*
 * Washing. A paw held up beside the mouth and a tongue that flicks out to meet it.
 *
 * Offsets into the face rather than a pose of her own, the same way the yawn works, which is only
 * possible because every pose is built on the same head: eyes at columns 5, 6, 11 and 12 and the
 * mouth at 7 to 9. The paw sits just right of the mouth, over the pale muzzle, so fur-coloured pixels
 * there read as a paw in front of her face.
 */
const GROOM = { pawX: 10, pawY: 9, tipX: 11, tipY: 8, tongueX: 9, tongueY: 10 };
const GROOM_MS = 1900;
const GROOM_LICK_MS = 220;

/*
 * Kneading, which cats do when they have decided a thing is safe.
 *
 * Loaf only. Her paws are the two shaded pairs on the loaf's second-from-bottom row, at columns 4-5
 * and 14-15, and every other pose puts them somewhere else. A behaviour that only reads in one pose
 * belongs in that pose rather than in an average of all of them.
 */
const KNEAD = { y: 17, left: 4, right: 14, w: 2 };
const KNEAD_BEAT_MS = 460;

/*
 * An ear twitch. One pixel, on the outside edge of one ear, for a tenth of a second.
 *
 * Additive rather than a redraw, because erasing part of a blitted sprite means knowing what was
 * behind it, and what is behind her ear is whatever wall the hour has painted. A pixel appearing on
 * the outside edge reads as the ear moving; a pixel missing from the inside reads as damage.
 */
const EAR = { y: 1, left: 2, right: 15 };
const EAR_FLICK_MS = 110;

export function Cat({
  label,
  look,
  clock,
  mood,
  nudge,
  reserveBelow = ROOM_RESERVE,
  staying = false,
  eyesOpen = false,
  framed = false,
  doodle = null,
  blanket = null,
  sky = "clear",
  spot = null,
  doorOpenAt = null,
  watchDoorAt = null,
  box = false,
  brought = false,
  brushed = false,
  satWith = false,
  firstEver = false,
  monthsOld = 0,
  gift = null,
  cake = false,
  windowLight = false,
  onWindowLight,
  shelfDown = false,
  mugFell = null,
  onTidy,
  role = null,
  together = false,
  onPet,
  onPoke,
  onFound,
  onCapture,
  onProps,
  bothCalledHer = false,
  dreamContext,
  onDream,
  collectionKey,
}: {
  label: string;
  look: CatLook;
  clock: Clock;
  mood: Mood | null;
  nudge: number;
  eyesOpen?: boolean;
  framed?: boolean;
  doorOpenAt?: number | null;
  spot?: number | null;
  doodle?: string | null;
  blanket?: RoomView["blanket"];
  sky?: RoomView["sky"];
  reserveBelow?: number;
  staying?: boolean;
  watchDoorAt?: number | null;
  box?: boolean;
  brought?: boolean;
  brushed?: boolean;
  satWith?: boolean;
  firstEver?: boolean;
  monthsOld?: number;
  gift?: Gift | null;
  cake?: boolean;
  windowLight?: boolean;
  onWindowLight?: () => void;
  mugFell?: number | null;
  shelfDown?: boolean;
  onTidy?: () => void;
  role?: "him" | "her" | null;
  together?: boolean;
  onPet?: () => void;
  onPoke?: () => void;
  onFound?: (key: DiscoveryKey) => void;
  onCapture?: (capture: () => Promise<Blob | null>) => void;
  onProps?: (props: { key: string; label: string }[], poke: (key: string) => void) => void;
  bothCalledHer?: boolean;
  dreamContext?: DreamContext;
  onDream?: (dream: Dream) => void;
  collectionKey?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const lookRef = useRef(look);
  const clockRef = useRef(clock);
  const moodRef = useRef(mood);
  const eyesRef = useRef(eyesOpen);
  eyesRef.current = eyesOpen;
  const framedRef = useRef(framed);
  framedRef.current = framed;
  const doodleRef = useRef(doodle);
  doodleRef.current = doodle;
  const blanketRef = useRef(blanket);
  blanketRef.current = blanket;
  const skyRef = useRef(sky);
  skyRef.current = sky;
  const spotRef = useRef(spot);
  spotRef.current = spot;
  const doorRef = useRef(doorOpenAt);
  doorRef.current = doorOpenAt;
  const boxRef = useRef(box);
  boxRef.current = box;
  const broughtRef = useRef(brought);
  broughtRef.current = brought;
  const brushedRef = useRef(brushed);
  brushedRef.current = brushed;
  const satWithRef = useRef(satWith);
  satWithRef.current = satWith;
  const monthsOldRef = useRef(monthsOld);
  monthsOldRef.current = monthsOld;
  const firstEverRef = useRef(firstEver);
  firstEverRef.current = firstEver;

  const saidHello = useRef(false);
  useEffect(() => {
    if (!firstEver || saidHello.current) return;
    saidHello.current = true;
    play("hello");
    bounce.current = 1;
    speakUntil.current = performance.now() + 2000;
  }, [firstEver]);
  const steps = useRef<{ x: number; at: number }[]>([]);
  const steppedFrom = useRef<number | null>(null);
  const giftRef = useRef(gift);
  giftRef.current = gift;
  const cakeRef = useRef(cake);
  cakeRef.current = cake;
  const windowLightRef = useRef(windowLight);
  windowLightRef.current = windowLight;
  const onWindowLightRef = useRef(onWindowLight);
  onWindowLightRef.current = onWindowLight;
  useEffect(() => {
    if (mugFell === null) return;
    lookAt.current = { x: MUG_FLOOR_X + 4, until: performance.now() + 2600 };
    speakUntil.current = performance.now() + 1200;
  }, [mugFell]);

  const downRef = useRef(shelfDown);
  downRef.current = shelfDown;
  const tidyRef = useRef(onTidy);
  tidyRef.current = onTidy;
  const zoom = useRef({ next: 0, start: -1e9 });
  const bird = useRef(-1e9);
  const shootingStar = useRef(-1e9);
  const windowLightTouchedAt = useRef(-1e9);
  const windowTaps = useRef({ count: 0, last: -1e9, constellationUntil: -1e9, sunCatcherUntil: -1e9 });
  const boxPeekUntil = useRef(-1e9);
  const boxTaps = useRef({ count: 0, last: -1e9, playUntil: -1e9 });
  const bedNestUntil = useRef(-1e9);
  const fallingLeaf = useRef(-1e9);
  const plantTaps = useRef({ count: 0, last: -1e9, rainUntil: -1e9, rainbowUntil: -1e9, bloomUntil: -1e9 });
  const photoGlint = useRef(-1e9);
  const photoTaps = useRef({ count: 0, last: -1e9, memoryUntil: -1e9 });
  const mugSteamedAt = useRef(-1e9);
  const mugTaps = useRef({ count: 0, last: -1e9, glowUntil: -1e9 });
  const giftGlint = useRef(-1e9);
  const giftTaps = useRef({ count: 0, last: -1e9, wishUntil: -1e9 });
  const bedTaps = useRef({ count: 0, last: -1e9, dreamUntil: -1e9, scene: "fish" as DreamScene });
  const bothCalledRef = useRef(bothCalledHer);
  bothCalledRef.current = bothCalledHer;
  const dreamCtxRef = useRef(dreamContext);
  dreamCtxRef.current = dreamContext;
  const onDreamRef = useRef(onDream);
  onDreamRef.current = onDream;
  const catTaps = useRef({ count: 0, last: -1e9, chorusUntil: -1e9 });
  const floorPress = useRef<{ x: number; y: number; at: number; active: boolean } | null>(null);
  const laser = useRef({ x: GW / 2, y: FLOOR + 12, until: -1e9 });
  const laserTrail = useRef<{ x: number; y: number; at: number }[]>([]);
  const roomTour = useRef({ seen: new Set<string>(), partyUntil: -1e9 });
  const doorTaps = useRef({ count: 0, last: -1e9, noteUntil: -1e9 });
  const auroraUntil = useRef(-1e9);
  const summonUntil = useRef(-1e9);
  const secretBoxUntil = useRef(-1e9);
  const yarnUntil = useRef(-1e9);
  const treatUntil = useRef(-1e9);
  const catnipUntil = useRef(-1e9);
  const music = useRef({ until: -1e9, x: GW / 2 });
  const mouseStartedAt = useRef(-1e9);
  const bubbleGame = useRef<{
    startedAt: number;
    seeds: BubbleSeed[];
    popped: Set<number>;
    completedAt: number;
    lastPop: { x: number; y: number; at: number } | null;
  }>({
    startedAt: -1e9,
    seeds: [],
    popped: new Set(),
    completedAt: -1e9,
    lastPop: null,
  });
  const pianoGame = useRef({
    until: -1e9,
    center: GW / 2,
    lastKey: -1,
    lastAt: -1e9,
    history: [] as number[],
    rewardUntil: -1e9,
  });
  const constellation = useRef({
    found: new Set<ConstellationKey>(collectionKey ? constellationProgress(collectionKey).found : []),
    flight: null as { fromX: number; fromY: number; startedAt: number } | null,
    rewardUntil: -1e9,
  });
  const collectionKeyRef = useRef(collectionKey);
  collectionKeyRef.current = collectionKey;
  const nameCallUntil = useRef(-1e9);
  const slowBlink = useRef({ until: -1e9, answered: false, greeted: false });
  const warmSpot = useRef<number | null>(null);
  const rainHeard = useRef(-1e9);
  const yawn = useRef({ at: -1e9, next: -1e9 });
  const groom = useRef({ at: -1e9, next: 24000 + Math.random() * 30000 });
  const chattered = useRef(-1);
  const earFlick = useRef({ at: -1e9, next: 6000, side: 1 });
  const doorShutFrom = useRef({ at: 0, from: 0 });
  lookRef.current = look;
  clockRef.current = clock;
  moodRef.current = mood;

  const togetherRef = useRef(together);
  togetherRef.current = together;

  const roleRef = useRef(role);
  const onPetRef = useRef(onPet);
  const onPokeRef = useRef(onPoke);
  const onFoundRef = useRef(onFound);
  roleRef.current = role;
  onPetRef.current = onPet;
  onPokeRef.current = onPoke;
  onFoundRef.current = onFound;

  const petting = useRef(false);
  const petDepth = useRef(0);
  const toldVoice = useRef(-1);
  const catBox = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const camRef = useRef(0);
  const poked = useRef<{ key: string; at: number } | null>(null);
  const lookAt = useRef<{ x: number; until: number } | null>(null);

  const near = useRef(0);
  const catX = useRef<number | null>(null);
  const bounce = useRef(0);
  const lastNudge = useRef(nudge);

  useEffect(() => {
    if (!onProps) return;
    const cv = ref.current;
    if (!cv) return;

    const poke = (key: string): void => {
      const prop = PROPS.find((p) => p.key === key);
      if (!prop) return;
      const rect = cv.getBoundingClientRect();
      const cx = prop.x + prop.sp.w / 2;
      const cy = prop.y + prop.sp.h / 2;
      const clientX = rect.left + ((cx - camRef.current) / VW) * rect.width;
      const clientY = rect.top + (cy / GH) * rect.height;
      const init: PointerEventInit = {
        clientX,
        clientY,
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
      };
      const before = document.activeElement as HTMLElement | null;
      // A synthetic pointer event rather than a second code path. The furniture handler grows with
      // every secret, and a parallel keyboard branch would drift from it within a week.
      cv.dispatchEvent(new PointerEvent("pointerdown", init));
      cv.dispatchEvent(new PointerEvent("pointerup", init));
      if (before && before !== cv && document.activeElement === cv) before.focus({ preventScroll: true });
    };

    onProps(
      PROPS.map((p) => ({ key: p.key, label: PROP_LABELS[p.key] ?? p.key })),
      poke,
    );
  }, [onProps]);

  useEffect(() => {
    if (!onCapture) return;
    onCapture(
      () =>
        new Promise((resolve) => {
          const canvas = ref.current;
          if (!canvas) return resolve(null);
          canvas.toBlob((blob) => resolve(blob), "image/png");
        }),
    );
  }, [onCapture]);

  const speakUntil = useRef(0);

  useEffect(() => {
    if (nudge !== lastNudge.current) {
      lastNudge.current = nudge;
      bounce.current = 1;
      speakUntil.current = performance.now() + 1700;
    }
  }, [nudge]);

  const seenDoodle = useRef<string | null | undefined>(undefined);
  const glanceUntil = useRef(0);
  useEffect(() => {
    const first = seenDoodle.current === undefined;
    const changed = seenDoodle.current !== doodle;
    seenDoodle.current = doodle;
    if (first || !changed || doodle === null) return;
    glanceUntil.current = performance.now() + GLANCE_MS;
    lookAt.current = { x: FRAME_CENTRE, until: glanceUntil.current };
  }, [doodle]);

  const mothSwipe = useRef({ visit: -1, at: -Infinity });
  const reserveRef = useRef(reserveBelow);
  reserveRef.current = reserveBelow;
  const stayingRef = useRef(staying);
  stayingRef.current = staying;
  const stayDepth = useRef(0);
  const bellyFound = useRef(false);
  const stayPurred = useRef(false);
  const watchDoorUntil = useRef(0);
  useEffect(() => {
    if (watchDoorAt === null) return;
    watchDoorUntil.current = performance.now() + WATCH_DOOR_MS;
    lookAt.current = { x: DOOR_CENTRE, until: watchDoorUntil.current };
  }, [watchDoorAt]);

  useEffect(() => {
    const cv = ref.current!;
    const g = cv.getContext("2d")!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lunar = moonPhase(new Date());
    const season = seasonFor(new Date());
    const seasonalPlant = seasonalPlantColors(season);

    let s = 5;
    let cam = 0;

    const box = cv.parentElement;
    let refit = 0;
    const fit = () => {
      cancelAnimationFrame(refit);
      // One logical pixel has to be a whole number of device pixels, or the floorboards come out at
      // two different widths. Hence the floor(), and the retry below when a measurement reads zero.
      const d = Math.min(2, devicePixelRatio || 1);
      const wide = box ? box.clientWidth : cv.getBoundingClientRect().width;
      const h = innerHeight;
      // The reserve is a ceiling, not a floor. It was max(62%, h - reserve) once, which meant "take at
      // least 62% whatever is below you" and put the front door's own button under the fold at 720px.
      const cap = h > 0 ? Math.min(h * ROOM_MAX_SHARE, h - reserveRef.current) : Infinity;
      const avail = Math.min(wide > 0 ? wide : Infinity, cap);
      if (!Number.isFinite(avail) || avail < VW) {
        refit = requestAnimationFrame(fit);
        return;
      }
      s = Math.max(1, Math.floor((avail * d) / VW));
      cv.width = VW * s;
      cv.height = GH * s;
      cv.style.width = `${cv.width / d}px`;
      cv.style.height = `${cv.height / d}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box ?? cv);
    addEventListener("resize", fit);

    const ptr = {
      x: GW / 2,
      y: FLOOR + 10,
      in: false,
      stillX: GW / 2,
      stillY: FLOOR + 10,
      stillSince: performance.now(),
    };
    let roomCodeAt = 0;
    let typedRoomCode = "";
    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      const nextX = cam + ((e.clientX - r.left) / r.width) * VW;
      const nextY = ((e.clientY - r.top) / r.height) * GH;
      if (Math.hypot(nextX - ptr.stillX, nextY - ptr.stillY) > 1.2) {
        ptr.stillX = nextX;
        ptr.stillY = nextY;
        ptr.stillSince = performance.now();
        slowBlink.current.answered = false;
      }
      ptr.x = nextX;
      ptr.y = nextY;
      ptr.in = true;
      const press = floorPress.current;
      const now = performance.now();
      if (press && now - press.at >= 460) {
        if (!press.active) {
          press.active = true;
          speakUntil.current = now + 850;
          play("mrrp");
        }
        laser.current = {
          x: Math.max(10, Math.min(GW - 10, ptr.x)),
          y: Math.max(FLOOR + 3, Math.min(GH - 4, ptr.y)),
          until: now + 260,
        };
        const trail = laserTrail.current;
        if (!trail.length || now - trail[trail.length - 1]!.at > 55) {
          trail.push({ x: laser.current.x, y: laser.current.y, at: now });
          if (trail.length > 9) trail.shift();
        }
        lookAt.current = { x: laser.current.x, until: laser.current.until };
      }
    };
    const onLeave = () => {
      ptr.in = false;
      petting.current = false;
      slowBlink.current.answered = false;
      if (floorPress.current?.active) laser.current.until = performance.now() + LASER_RELEASE_MS;
      floorPress.current = null;
      lookAt.current = null;
      poked.current = null;
    };

    const gridAt = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      return { x: cam + ((e.clientX - r.left) / r.width) * VW, y: ((e.clientY - r.top) / r.height) * GH };
    };
    const onDown = (e: PointerEvent) => {
      cv.focus({ preventScroll: true });
      const { x, y } = gridAt(e);
      ptr.x = x;
      ptr.y = y;
      ptr.in = true;
      const game = bubbleGame.current;
      const bubbleElapsed = performance.now() - game.startedAt;
      if (bubbleElapsed >= 0 && bubbleElapsed < BUBBLE_GAME_MS && game.completedAt < 0) {
        const bubbleHit = game.seeds.findIndex((seed, index) => {
          if (game.popped.has(index)) return false;
          const bubble = bubbleMomentAt(seed, bubbleElapsed, reduce);
          return bubble !== null && Math.hypot(x - bubble.x, y - bubble.y) <= 5;
        });
        if (bubbleHit >= 0) {
          const now = performance.now();
          const bubble = bubbleMomentAt(game.seeds[bubbleHit]!, bubbleElapsed, reduce)!;
          game.popped.add(bubbleHit);
          game.lastPop = { x: bubble.x, y: bubble.y, at: now };
          lookAt.current = { x: bubble.x, until: now + 1100 };
          bounce.current = 1;
          play("brush");
          if (game.popped.size === game.seeds.length) {
            game.completedAt = now;
            catTaps.current.chorusUntil = now + BUBBLE_REWARD_MS;
            onFoundRef.current?.("bubbles");
            speakUntil.current = now + 1200;
            play("purr");
          }
          return;
        }
      }
      const piano = pianoGame.current;
      if (performance.now() < piano.until) {
        const key = pianoKeyAt(pianoKeys(piano.center), x, y);
        if (key !== null) {
          const now = performance.now();
          const melody = advancePawMelody(piano.history, key);
          piano.history = melody.history;
          piano.lastKey = key;
          piano.lastAt = now;
          lookAt.current = { x, until: now + 900 };
          bounce.current = 1;
          playPianoNote(key);
          if (melody.complete) {
            piano.rewardUntil = now + PIANO_REWARD_MS;
            onFoundRef.current?.("piano");
            speakUntil.current = now + 1100;
            play("purr");
          }
          return;
        }
      }
      const b = catBox.current;
      if (b && x >= b.x0 - 2 && x <= b.x1 + 2 && y >= b.y0 - 2 && y <= b.y1 + 3) {
        const now = performance.now();
        if (roleRef.current === "him") {
          petting.current = true;
          onPetRef.current?.();
        } else if (roleRef.current === "her") onPokeRef.current?.();
        else {
          bounce.current = 1;
          speakUntil.current = now + 1100;
          play("mrrp");
        }
        if (roleRef.current) {
          const taps = catTaps.current;
          taps.count = now - taps.last < 1200 ? taps.count + 1 : 1;
          taps.last = now;
          if (taps.count >= 3) {
            taps.chorusUntil = now + PURR_CHORUS_MS;
            taps.count = 0;
            speakUntil.current = now + 1250;
            play("mrrp");
          }
        }
        return;
      }
      if (
        downRef.current &&
        x >= MUG_FLOOR_X - 3 &&
        x < MUG_FLOOR_X + 11 &&
        y >= MUG_FLOOR_Y - 3 &&
        y < MUG_FLOOR_Y + 7
      ) {
        poked.current = { key: "shelf", at: performance.now() };
        lookAt.current = { x: MUG_FLOOR_X + 4, until: performance.now() + 2400 };
        tidyRef.current?.();
        return;
      }
      if (giftRef.current && x >= 14 && x < 24 && y >= FLOOR + 13 && y < FLOOR + 22) {
        const now = performance.now();
        giftGlint.current = now;
        speakUntil.current = now + 800;
        lookAt.current = { x: 19, until: performance.now() + 1900 };
        const taps = giftTaps.current;
        taps.count = now - taps.last < 1200 ? taps.count + 1 : 1;
        taps.last = now;
        if (taps.count >= 2) {
          taps.wishUntil = now + GIFT_WISH_MS;
          taps.count = 0;
          play("twinkle");
        } else {
          play("mrrp");
        }
        return;
      }
      const boxIsHere = boxRef.current || performance.now() < secretBoxUntil.current;
      const hit = PROPS.find(
        (q) => (q.key !== "box" || boxIsHere) && x >= q.x && x < q.x + q.sp.w && y >= q.y && y < q.y + q.sp.h,
      );
      let rainStarted = false;
      if (hit?.key === "window") {
        const now = performance.now();
        const scene = sceneFor(
          clockRef.current,
          Date.now(),
          moodRef.current,
          togetherRef.current,
          spotRef.current,
        );
        if (windowLightRef.current && roleRef.current) {
          windowLightTouchedAt.current = now;
          windowTaps.current.count = 0;
          onWindowLightRef.current?.();
          play("glint");
        }
        if (scene.sun < 0.12) {
          shootingStar.current = now;
          const taps = windowTaps.current;
          taps.count = now - taps.last < 1400 ? taps.count + 1 : 1;
          taps.last = now;
          if (taps.count >= 2) {
            taps.constellationUntil = now + CONSTELLATION_MS;
            taps.count = 0;
            if (roleRef.current && !windowLightRef.current) {
              windowLightTouchedAt.current = now;
              onWindowLightRef.current?.();
            }
          }
        } else {
          bird.current = now;
          play("chirp");
          const taps = windowTaps.current;
          taps.count = now - taps.last < 1400 ? taps.count + 1 : 1;
          taps.last = now;
          if (taps.count >= 2) {
            taps.sunCatcherUntil = now + SUN_CATCHER_MS;
            taps.count = 0;
            if (roleRef.current && !windowLightRef.current) {
              windowLightTouchedAt.current = now;
              onWindowLightRef.current?.();
            }
          }
        }
      }
      if (hit?.key === "plant") {
        const now = performance.now();
        fallingLeaf.current = now;
        const taps = plantTaps.current;
        taps.count = now - taps.last < 1650 ? taps.count + 1 : 1;
        taps.last = now;
        if (taps.count >= 3) {
          taps.rainUntil = now + RAIN_MS;
          taps.rainbowUntil = taps.rainUntil + RAINBOW_MS;
          taps.bloomUntil = taps.rainbowUntil + PLANT_BLOOM_MS;
          taps.count = 0;
          rainStarted = true;
        }
      }
      if (hit?.key === "frame" && framedRef.current) {
        const now = performance.now();
        photoGlint.current = now;
        const taps = photoTaps.current;
        taps.count = now - taps.last < 1200 ? taps.count + 1 : 1;
        taps.last = now;
        if (taps.count >= 2) {
          taps.memoryUntil = now + PHOTO_MEMORY_MS;
          taps.count = 0;
          play("twinkle");
        } else {
          play("shutter");
        }
      }
      if (hit?.key === "box" && boxIsHere) {
        const now = performance.now();
        const taps = boxTaps.current;
        taps.count = now - taps.last < 1250 ? taps.count + 1 : 1;
        taps.last = now;
        if (taps.count >= 2) {
          taps.count = 0;
          taps.playUntil = now + BOX_PLAY_MS;
          boxPeekUntil.current = taps.playUntil;
          speakUntil.current = now + 1100;
          play("twinkle");
        } else {
          boxPeekUntil.current = now + 1200;
          speakUntil.current = now + 800;
          play("mrrp");
        }
      }
      if (hit?.key === "bed") {
        const now = performance.now();
        bedNestUntil.current = now + 8000;
        const taps = bedTaps.current;
        taps.count = now - taps.last < 1300 ? taps.count + 1 : 1;
        taps.last = now;
        if (taps.count >= 2) {
          taps.dreamUntil = now + BED_DREAM_MS;
          taps.count = 0;
          play("settle");
          const context = dreamCtxRef.current;
          if (context) {
            const dream = dreamOf(context, now);
            taps.scene = dream.scene;
            onDreamRef.current?.(dream);
          }
        }
      }
      if (hit?.key === "shelf" && !downRef.current) {
        const now = performance.now();
        mugSteamedAt.current = now;
        const taps = mugTaps.current;
        taps.count = now - taps.last < 1200 ? taps.count + 1 : 1;
        taps.last = now;
        if (taps.count >= 2) {
          taps.glowUntil = now + MUG_GLOW_MS;
          taps.count = 0;
          play("twinkle");
        }
      }
      if (hit?.key === "door") {
        const now = performance.now();
        speakUntil.current = now + 900;
        const taps = doorTaps.current;
        taps.count = now - taps.last < 1250 ? taps.count + 1 : 1;
        taps.last = now;
        if (taps.count >= 2) {
          taps.noteUntil = now + DOOR_NOTE_MS;
          taps.count = 0;
          play("thump");
        } else {
          play("mrrp");
        }
      }
      if (hit) {
        const activeCollectionKey = collectionKeyRef.current;
        if (activeCollectionKey && (CONSTELLATION_KEYS as readonly string[]).includes(hit.key)) {
          const now = performance.now();
          const progress = collectConstellationStar(activeCollectionKey, hit.key as ConstellationKey);
          if (progress.discovered) {
            constellation.current.found = new Set(progress.found);
            constellation.current.flight = {
              fromX: hit.x + hit.sp.w / 2,
              fromY: hit.y + hit.sp.h / 2,
              startedAt: now,
            };
            lookAt.current = { x: hit.x + hit.sp.w / 2, until: now + STAR_FLIGHT_MS };
            speakUntil.current = now + 900;
            play("twinkle");
            if (progress.justCompleted) {
              constellation.current.rewardUntil = now + CONSTELLATION_REWARD_MS;
              catTaps.current.chorusUntil = now + PURR_CHORUS_MS;
              speakUntil.current = now + 1400;
              bounce.current = 1;
              play("purr");
              onFoundRef.current?.("constellation");
            }
          }
        }
        if ((ROOM_TOUR_KEYS as readonly string[]).includes(hit.key)) {
          const tour = roomTour.current;
          tour.seen.add(hit.key);
          if (tour.seen.size === ROOM_TOUR_KEYS.length) {
            const now = performance.now();
            tour.seen.clear();
            tour.partyUntil = now + ROOM_TOUR_MS;
            catTaps.current.chorusUntil = now + PURR_CHORUS_MS;
            speakUntil.current = now + 1200;
            play("twinkle");
            onFoundRef.current?.("roomTour");
          }
        }
        poked.current = { key: hit.key, at: performance.now() };
        lookAt.current = {
          x: rainStarted ? WIN_CX : hit.x + hit.sp.w / 2,
          until: performance.now() + (rainStarted ? 4200 : 2400),
        };
      }
      if (!hit && y >= FLOOR) {
        floorPress.current = { x, y, at: performance.now(), active: false };
        lookAt.current = { x, until: performance.now() + 900 };
        poked.current = { key: "floor", at: performance.now() };
      }
    };
    const onUp = () => {
      petting.current = false;
      ptr.in = true;
      const press = floorPress.current;
      floorPress.current = null;
      if (!press || performance.now() - press.at < 460) return;
      if (press.active) {
        laser.current.until = performance.now() + LASER_RELEASE_MS;
        lookAt.current = { x: laser.current.x, until: laser.current.until };
        return;
      }
      laser.current = {
        x: Math.max(10, Math.min(GW - 10, press.x)),
        y: Math.max(FLOOR + 3, Math.min(GH - 4, press.y)),
        until: performance.now() + LASER_CHASE_MS,
      };
      lookAt.current = { x: laser.current.x, until: laser.current.until };
      speakUntil.current = performance.now() + 850;
      play("mrrp");
    };
    const onCancel = () => {
      petting.current = false;
      floorPress.current = null;
    };
    const onKey = (e: KeyboardEvent) => {
      if (ROOM_CODE.includes(e.key)) e.preventDefault();
      const expected = ROOM_CODE[roomCodeAt];
      roomCodeAt = e.key === expected ? roomCodeAt + 1 : e.key === ROOM_CODE[0] ? 1 : 0;
      if (roomCodeAt === ROOM_CODE.length) {
        const now = performance.now();
        const scene = sceneFor(
          clockRef.current,
          Date.now(),
          moodRef.current,
          togetherRef.current,
          spotRef.current,
        );
        if (scene.sun < 0.12) {
          auroraUntil.current = now + AURORA_MS;
        } else {
          windowTaps.current.sunCatcherUntil = now + AURORA_MS;
          bird.current = now;
        }
        play("twinkle");
        onFoundRef.current?.("aurora");
        speakUntil.current = now + 1000;
        roomCodeAt = 0;
      }

      if (e.key.length === 1 && /[a-z]/i.test(e.key)) {
        const nameCode = catCallCode(lookRef.current.name);
        typedRoomCode = `${typedRoomCode}${e.key.toLowerCase()}`.slice(
          -Math.max(
            TYPED_ROOM_CODE.length,
            SUMMON_CODE.length,
            BOX_CODE.length,
            YARN_CODE.length,
            TREAT_CODE.length,
            CATNIP_CODE.length,
            MUSIC_CODE.length,
            MOUSE_CODE.length,
            BUBBLE_CODE.length,
            PIANO_CODE.length,
            STARS_CODE.length,
            nameCode?.length ?? 0,
          ),
        );
        if (nameCode && typedRoomCode.endsWith(nameCode)) {
          const now = performance.now();
          nameCallUntil.current = now + NAME_CALL_MS;
          onFoundRef.current?.("herName");
          speakUntil.current = now + 1200;
          bounce.current = 1;
          typedRoomCode = "";
          play("purr");
          if (bothCalledRef.current && Math.random() < 1 / 3) {
            summonUntil.current = now + SUMMON_MS;
          }
        } else if (typedRoomCode.endsWith(TYPED_ROOM_CODE)) {
          const now = performance.now();
          catTaps.current.chorusUntil = now + PURR_CHORUS_MS;
          speakUntil.current = now + 1250;
          onFoundRef.current?.("mrrp");
          typedRoomCode = "";
          play("purr");
        } else if (typedRoomCode.endsWith(SUMMON_CODE)) {
          const now = performance.now();
          summonUntil.current = now + SUMMON_MS;
          onFoundRef.current?.("summon");
          speakUntil.current = now + 1000;
          typedRoomCode = "";
          play("chirp");
        } else if (typedRoomCode.endsWith(BOX_CODE)) {
          const now = performance.now();
          secretBoxUntil.current = now + SECRET_BOX_MS;
          onFoundRef.current?.("box");
          boxPeekUntil.current = now + 1200;
          lookAt.current = { x: BOX_X + 5, until: now + 2200 };
          speakUntil.current = now + 950;
          bounce.current = 1;
          typedRoomCode = "";
          play("thump");
        } else if (typedRoomCode.endsWith(YARN_CODE)) {
          const now = performance.now();
          yarnUntil.current = now + YARN_MS;
          onFoundRef.current?.("yarn");
          speakUntil.current = now + 900;
          bounce.current = 1;
          typedRoomCode = "";
          play("brush");
        } else if (typedRoomCode.endsWith(TREAT_CODE)) {
          const now = performance.now();
          treatUntil.current = now + TREAT_MS;
          onFoundRef.current?.("treat");
          lookAt.current = { x: TREAT_X, until: now + TREAT_MS };
          speakUntil.current = now + 900;
          bounce.current = 1;
          typedRoomCode = "";
          play("settle");
        } else if (typedRoomCode.endsWith(CATNIP_CODE)) {
          const now = performance.now();
          catnipUntil.current = now + CATNIP_MS;
          onFoundRef.current?.("catnip");
          lookAt.current = { x: CATNIP_X, until: now + CATNIP_MS };
          speakUntil.current = now + 1100;
          bounce.current = 1;
          typedRoomCode = "";
          play("chirp");
        } else if (typedRoomCode.endsWith(MUSIC_CODE)) {
          const now = performance.now();
          music.current = { until: now + MUSIC_MS, x: catX.current ?? GW / 2 };
          onFoundRef.current?.("music");
          speakUntil.current = now + 950;
          bounce.current = 1;
          typedRoomCode = "";
          play("jingle");
        } else if (typedRoomCode.endsWith(MOUSE_CODE)) {
          const now = performance.now();
          mouseStartedAt.current = now;
          onFoundRef.current?.("mouse");
          lookAt.current = { x: 14, until: now + MOUSE_MS };
          speakUntil.current = now + 1100;
          bounce.current = 1;
          typedRoomCode = "";
          play("chirp");
        } else if (typedRoomCode.endsWith(BUBBLE_CODE)) {
          const now = performance.now();
          bubbleGame.current = {
            startedAt: now,
            seeds: bubbleSeeds(catX.current ?? GW / 2),
            popped: new Set(),
            completedAt: -1e9,
            lastPop: null,
          };
          onFoundRef.current?.("bubbles");
          speakUntil.current = now + 1050;
          bounce.current = 1;
          typedRoomCode = "";
          play("twinkle");
        } else if (typedRoomCode.endsWith(PIANO_CODE)) {
          const now = performance.now();
          pianoGame.current = {
            until: now + PIANO_MS,
            center: catX.current ?? GW / 2,
            lastKey: -1,
            lastAt: -1e9,
            history: [],
            rewardUntil: -1e9,
          };
          onFoundRef.current?.("piano");
          speakUntil.current = now + 950;
          bounce.current = 1;
          typedRoomCode = "";
          play("twinkle");
        } else if (typedRoomCode.endsWith(STARS_CODE)) {
          if (constellation.current.found.size === CONSTELLATION_KEYS.length) {
            const now = performance.now();
            constellation.current.rewardUntil = now + CONSTELLATION_REWARD_MS;
            catTaps.current.chorusUntil = now + PURR_CHORUS_MS;
            speakUntil.current = now + 1200;
            bounce.current = 1;
            play("twinkle");
            onFoundRef.current?.("constellation");
          }
          typedRoomCode = "";
        }
      } else if (!ROOM_CODE.includes(e.key)) {
        typedRoomCode = "";
      }
    };
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerleave", onLeave);
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointerup", onUp);
    cv.addEventListener("pointercancel", onCancel);
    cv.addEventListener("keydown", onKey);

    const motes = Array.from({ length: 12 }, () => ({
      dx: Math.floor(Math.random() * 15) - 7,
      y: Math.random() * FLOOR,
      sp: 0.04 + Math.random() * 0.06,
    }));

    const px = (x: number, y: number, c: string) => {
      if (!c || y < 0 || y >= GH) return;
      const vx = x - cam;
      if (vx < 0 || vx >= VW) return;
      const X = Math.round(vx * s),
        Y = Math.round(y * s);
      g.fillStyle = c;
      g.fillRect(X, Y, Math.round((vx + 1) * s) - X, Math.round((y + 1) * s) - Y);
    };

    const rect = (x: number, y: number, w: number, h: number, c: string) => {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, c);
    };

    // Fixed marks, never random texture: random pixels reshuffle every frame and make a calm room
    // shimmer.
    const dither = (x: number, y: number, w: number, h: number, c: string, phase = 0) => {
      for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
          if ((x + i + y + j + phase) % 2 === 0) px(x + i, y + j, c);
        }
      }
    };

    const blit = (sp: Sprite, x: number, y: number, pal: Record<string, string>, flip = false) => {
      for (let j = 0; j < sp.h; j++) {
        const row = sp.rows[j]!;
        for (let i = 0; i < sp.w; i++) {
          const ch = row[flip ? sp.w - 1 - i : i]!;
          px(x + sp.ox + i, y + sp.oy + j, pal[ch] ?? "");
        }
      }
    };

    let raf = 0;
    // Reduced motion means the room is a still picture, so four frames a second keeps the clock
    // current for a tenth of the repaint cost. The loop still runs, so a tap still gets a frame.
    const minFrameMs = reduce ? 250 : 0;
    let lastFrame = -Infinity;

    const frame = (t: number) => {
      if (t - lastFrame < minFrameMs) {
        raf = requestAnimationFrame(frame);
        return;
      }
      lastFrame = t;
      const nowMs = Date.now();
      const openAt = doorRef.current;
      let doorProg: number;
      if (openAt) {
        doorProg = Math.min(3, ((nowMs - openAt) / 260) * 3);
        doorShutFrom.current = { at: nowMs, from: doorProg };
      } else {
        const since = nowMs - doorShutFrom.current.at;
        doorProg = Math.max(0, doorShutFrom.current.from * (1 - since / 900));
      }

      const camBase = Math.max(0, Math.min(GW - VW, Math.round((catX.current ?? GW / 2) - VW / 2)));
      // The camera leans toward the door while it is open, or nobody ever sees it: the view is 80 of
      // 100 columns and follows her, so the door at column 6 is usually off screen.
      const pull = doorProg / 3;
      cam = Math.round(camBase * (1 - pull) + Math.min(camBase, 2) * pull);
      camRef.current = cam;
      const L = lookRef.current;
      const sc = sceneFor(
        clockRef.current,
        Date.now(),
        moodRef.current,
        togetherRef.current,
        spotRef.current,
      );
      const beamX = Math.round(sc.beam * GW);

      rect(0, 0, GW, FLOOR - 9, sc.wallTop);
      rect(0, FLOOR - 9, GW, 9, sc.wallBottom);
      rect(0, FLOOR, GW, 10, sc.floorFar);
      rect(0, FLOOR + 10, GW, GH - FLOOR - 10, sc.floorNear);

      const wallShade = mixHex(sc.wallBottom, INK, 0.08);
      const wallLift = mixHex(sc.wallTop, sc.beamWarm, 0.12 + sc.sun * 0.08);
      // prettier-ignore
      for (const [x, y, w] of [[4, 8, 5], [38, 17, 3], [48, 7, 6], [90, 27, 4]] as const) {
        dither(x, y, w, 2, wallShade);
      }
      // prettier-ignore
      for (const [x, y] of [[12, 30], [34, 6], [52, 31], [96, 11]] as const) px(x, y, wallLift);
      rect(0, FLOOR - 1, GW, 1, mixHex(sc.wallBottom, sc.beamWarm, 0.3 + sc.sun * 0.35));
      rect(0, FLOOR, GW, 1, mixHex(sc.floorFar, INK, 0.14));
      const bleach = Math.min(1, monthsOldRef.current / 12);
      if (bleach > 0.02) {
        const faded = mixHex(sc.floorNear, sc.beamWarm, bleach * 0.16);
        rect(36, FLOOR + 4, 26, GH - FLOOR - 4, faded);
      }

      for (const by of [FLOOR + 9, FLOOR + 15, FLOOR + 23, FLOOR + 30]) rect(0, by, GW, 1, sc.floorFar);
      const boardJoin = mixHex(sc.floorFar, INK, 0.16);
      const boardGlint = mixHex(sc.floorNear, sc.beamWarm, 0.1 + sc.sun * 0.08);
      // prettier-ignore
      for (const [x, y, h] of [[8, 49, 8], [31, 49, 8], [70, 49, 8], [18, 58, 5], [52, 58, 5], [86, 58, 5], [5, 64, 7], [40, 64, 7], [75, 64, 7], [25, 72, 8], [62, 72, 8]] as const) {
        rect(x, y, 1, h, boardJoin);
        px(x + 1, y + 1, boardGlint);
      }

      const rugShadow = mixHex(sc.floorNear, INK, 0.25);
      const rugEdge = mixHex(sc.floorNear, "#765367", 0.58);
      const rugBody = mixHex(sc.floorNear, "#a8737e", 0.48);
      const rugThread = mixHex(rugBody, sc.beamWarm, 0.16);
      rect(35, FLOOR + 12, 40, 1, rugShadow);
      rect(32, FLOOR + 13, 46, 13, rugEdge);
      rect(34, FLOOR + 12, 42, 15, rugEdge);
      rect(35, FLOOR + 13, 40, 13, rugBody);

      if (spotRef.current !== null) {
        const wx = Math.max(41, Math.min(69, Math.round(spotRef.current * GW)));
        const worn = mixHex(rugBody, sc.beamWarm, 0.26);
        // Under the rug's threads, not over them: worn means the pile flattened, so the weave still
        // runs across it.
        rect(wx - 5, FLOOR + 16, 11, 1, worn);
        rect(wx - 7, FLOOR + 17, 15, 4, worn);
        rect(wx - 5, FLOOR + 21, 11, 1, worn);
      }

      dither(38, FLOOR + 16, 34, 1, rugThread);
      dither(38, FLOOR + 22, 34, 1, rugThread, 1);
      for (const x of [35, 40, 69, 74]) px(x, FLOOR + 27, rugEdge);

      /*
       * Her actual weather, or the plant easter egg, which both mean water on the glass. The egg wins
       * while it lasts, because somebody just made it happen and should see it happen.
       *
       * Worked out up here rather than down at the window, because a closed sky has to reach the beam
       * as well. Rain running down the glass with a full shaft of sun across the floor is the kind of
       * thing that reads as a bug even to somebody who could not say why.
       */
      const outside = skyRef.current;
      const raining = plantTaps.current.rainUntil - t > 0 || outside === "rain";
      const snowing = plantTaps.current.rainUntil - t <= 0 && outside === "snow";
      const overcast = outside === "cloud";
      // Softened, never removed. Cloud still lets light through, and taking the beam away entirely
      // would take the room's warmth with it on a week of bad weather.
      const dull = raining || snowing || overcast;
      const litWall = dull ? mixHex(sc.litWall, sc.wallTop, 0.66) : sc.litWall;
      const litPatch = dull ? mixHex(sc.patch, sc.floorNear, 0.66) : sc.patch;

      const beamCore = sc.lightPhase === "golden" ? 18 : sc.lightPhase === "dawn" ? 10 : 16;
      if (sc.lightPhase !== "night") {
        for (let y = 14; y < FLOOR; y++) {
          const k = (y - 14) / (FLOOR - 14);
          const cx = Math.round(WIN_CX + (beamX - WIN_CX) * k);
          const half = beamCore >> 1;
          rect(cx - half, y, beamCore, 1, litWall);
          dither(cx - half - 3, y, 3, 1, litWall);
          dither(cx + half, y, 3, 1, litWall);
          for (const ox of [-half - 5, -half - 4, half + 2, half + 3]) {
            if ((ox + y) % 4 === 0) px(cx + ox, y, litWall);
          }
        }
      }
      // prettier-ignore
      const POOL = [
        [1, 16], [2, 20], [3, 24], [4, 26], [5, 26], [6, 24], [7, 22], [8, 18], [9, 14],
      ] as const;
      const poolScale = sc.lightPhase === "golden" ? 1.14 : sc.lightPhase === "dawn" ? 0.72 : 1;
      if (sc.lightPhase !== "night") {
        for (const [dy, w] of POOL) {
          const width = Math.round(w * poolScale);
          rect(beamX - (width >> 1), FLOOR + dy, width, 1, litPatch);
        }
      }
      if (sc.lightPhase !== "night") {
        const edgeWidth = Math.round(30 * poolScale);
        dither(beamX - (edgeWidth >> 1), FLOOR + 5, edgeWidth, 9, sc.patch);
      } else {
        const nightGlow = mixHex(sc.wallBottom, "#d79a62", 0.3);
        // prettier-ignore
        for (const [dx, dy] of [[-6, -3], [-3, -6], [0, -7], [3, -6], [6, -3], [-4, -1], [4, -1]] as const) {
          px(40 + dx, FLOOR - 3 + dy, nightGlow);
        }
        rect(36, FLOOR - 6, 9, 1, mixHex(sc.wallBottom, "#d79a62", 0.16));
        rect(39, FLOOR - 4, 3, 3, INK);
        px(40, FLOOR - 3, "#ffd598");
      }

      const wy = (row: number) => 4 + 1 + row;

      const pk = poked.current;
      const shake = (key: string): number => {
        if (!pk || pk.key !== key) return 0;
        const age = t - pk.at;
        if (age < 0 || age > 620) return 0;
        return Math.round(Math.sin(age / 30) * (1 - age / 620) * 2);
      };
      const floorTap = pk?.key === "floor" && t - pk.at < 420;

      const night = sc.lightPhase === "night";
      const wx = WIN_X + shake("window");
      const rainRemaining = plantTaps.current.rainUntil - t;
      if (raining && !reduce && rainRemaining > 700 && t > rainHeard.current) {
        rainHeard.current = t + 2100;
        play("rain");
      }

      const curtainDark = mixHex(sc.wallBottom, "#66516f", 0.5);
      const curtainLight = mixHex(curtainDark, sc.beamWarm, 0.12 + sc.sun * 0.16);
      rect(wx - 3, 3, 2, 21, curtainDark);
      rect(wx - 1, 3, 1, 20, curtainLight);
      rect(wx + WINDOW.w, 3, 2, 21, curtainDark);
      rect(wx + WINDOW.w + 2, 3, 1, 20, curtainLight);
      const curtainHem = reduce ? 0 : Math.round(Math.sin(t / 2400));
      px(wx - 2 + curtainHem, 24, curtainLight);
      px(wx + WINDOW.w + 1 - curtainHem, 24, curtainLight);
      /*
       * Night wins over weather, and then the weather is mixed into the night.
       *
       * Weather came first in this chain and it made a rainy 2am glow like an overcast noon: the wet
       * grey is mixed off the wall colour, which is bright in the daytime keyframes. It went unnoticed
       * while the only thing that set `raining` was a six-second easter egg. Now that a real forecast
       * can hold it on all night, the order matters.
       */
      const nightGlass = raining
        ? mixHex("#2b3450", "#718aa1", 0.34)
        : snowing
          ? mixHex("#2b3450", "#cfd8e2", 0.3)
          : "#2b3450";
      const glass =
        sc.lightPhase === "night"
          ? nightGlass
          : raining
            ? mixHex(sc.wallTop, "#718aa1", 0.58)
            : snowing
              ? mixHex(sc.wallTop, "#cfd8e2", 0.62)
              : sc.lightPhase === "dawn"
                ? "#c79aaa"
                : sc.lightPhase === "golden"
                  ? "#d99672"
                  : sc.lightPhase === "evening"
                    ? "#685b7d"
                    : mixHex("#b7d8dc", sc.beamWarm, 0.2);
      blit(WINDOW, wx, 4, { w: INK, h: glass });

      /*
       * Weather on the glass, drawn after the window and before the skyline so it sits in front of the
       * sky and behind the frame, which is where water on a window actually is.
       *
       * Positions are hand-picked and the motion is a function of the clock, not of anything random.
       * A pane this small has room for four streaks; scattering them randomly puts two on top of each
       * other about as often as not, and it cannot be checked by looking.
       */
      if (raining && !reduce) {
        const wet = mixHex(glass, "#e8f1f4", 0.55);
        for (const [sx, phase] of RAIN_STREAKS) {
          const y = ((t / 420 + phase) % 1) * 9;
          rect(wx + sx, 5 + Math.floor(y), 1, 2, wet);
        }
      } else if (raining) {
        // Still weather, for anybody who asked not to be moved. Beads that sit where they are.
        const wet = mixHex(glass, "#e8f1f4", 0.55);
        for (const [sx] of RAIN_STREAKS) px(wx + sx, 8, wet);
      }
      if (snowing) {
        const flake = mixHex(glass, "#ffffff", 0.8);
        for (const [sx, phase] of SNOW_FLAKES) {
          const y = reduce ? 4 + phase * 6 : ((t / 1500 + phase) % 1) * 10;
          // Drifts one pixel sideways over its fall, which is the whole difference between snow and
          // very slow rain.
          const drift = Math.round(Math.sin(t / 1100 + phase * 6));
          px(wx + sx + drift, 5 + Math.floor(y), flake);
        }
      }
      if (overcast) {
        // No streaks, nothing moving. Cloud is the sky going flat, so the panes just lose their blue.
        rect(wx + 1, 5, WINDOW.w - 2, 9, mixHex(glass, "#b9bcc4", 0.3));
      }

      if (sc.lightPhase === "dawn") {
        rect(wx + 1, wy(7), 7, 1, "#e9b39d");
        rect(wx + 9, wy(7), 7, 1, "#e9b39d");
        px(wx + 13, wy(5), "#f6d2ac");
        px(wx + 14, wy(5), "#f6d2ac");
      } else if (sc.lightPhase === "day") {
        const cloud = mixHex(glass, "#fffdf2", 0.76);
        rect(wx + 3, wy(3), 5, 1, cloud);
        rect(wx + 5, wy(2), 3, 1, cloud);
        px(wx + 8, wy(3), cloud);
      } else if (sc.lightPhase === "golden") {
        rect(wx + 1, wy(7), 7, 1, "#efb071");
        rect(wx + 9, wy(7), 7, 1, "#efb071");
        rect(wx + 12, wy(3), 2, 2, "#ffe0a0");
      } else if (sc.lightPhase === "evening") {
        rect(wx + 1, wy(7), 7, 1, "#b87879");
        rect(wx + 9, wy(7), 7, 1, "#b87879");
        px(wx + 13, wy(2), "#f7dfbd");
      }

      const skyline = night ? "#252a42" : mixHex(sc.wallBottom, "#6d5f72", 0.48);
      rect(wx + 1, wy(8), 7, 1, skyline);
      rect(wx + 2, wy(7), 2, 1, skyline);
      rect(wx + 9, wy(8), 7, 1, skyline);
      rect(wx + 12, wy(6), 3, 2, skyline);
      if (night) {
        px(wx + 3, wy(7), "#e8bd72");
        px(wx + 11, wy(7), "#d99d62");
        px(wx + 14, wy(6), "#e8bd72");
      }
      /*
       * Breath on cold glass.
       *
       * Condensation gathers at the bottom of a pane, not across the middle of it, so this is the
       * last two rows of each of the four panes and nothing else. It breathes on a slow sine because
       * a static wash is a smudge on the sprite; moving, it is a warm room on a cold day.
       *
       * Drawn after the skyline and the season, because fog is on the inside of the window and
       * everything else out there is behind it.
       */
      const cold = snowing || season === "winter";
      if (cold) {
        const swell = reduce ? 0.3 : 0.3 + Math.sin(t / 4200) * 0.07;
        const fog = mixHex(glass, "#ffffff", swell);
        // wy(2) and wy(7) are the last two glass rows of each pane. wy(4) and wy(9) are the frame
        // bars between and below them, and fogging those paints over the window's own woodwork.
        for (const paneY of [wy(2), wy(7)]) {
          rect(wx + 1, paneY, 7, 2, fog);
          rect(wx + 9, paneY, 7, 2, fog);
        }
        /*
         * And a nose print, while she is at the window and only there.
         *
         * The glass colour painted back over the fog, so it reads as wiped rather than drawn. It is
         * the one mark in this room that is evidence of her rather than a picture of her.
         */
        if (Math.abs(sc.catX * GW - WIN_CX) < 9 && sc.sleepy < 0.5) {
          rect(wx + 10, wy(8), 3, 1, glass);
          px(wx + 11, wy(7), glass);
        }
      }
      rect(wx - 1, 15, WINDOW.w + 2, 1, mixHex(sc.wallBottom, INK, 0.24));
      rect(wx - 2, 16, WINDOW.w + 4, 1, mixHex(sc.wallBottom, "#a77a58", 0.42));
      if (raining) {
        rect(wx, 15, WINDOW.w, 1, mixHex(glass, "#dce7e6", 0.5));
        px(wx + 3, 17, mixHex(sc.wallBottom, glass, 0.5));
        px(wx + 12, 17, mixHex(sc.wallBottom, glass, 0.5));
      }
      if (snowing) {
        /*
         * Snow that has settled, as against snow going past.
         *
         * The flakes drifting behind the glass say it is snowing; this says it has been snowing for a
         * while, which is the difference between weather and a day. Uneven on purpose: a clean white
         * line across the sill is a painted stripe, and the two extra pixels in the corners are where
         * it gathers against the frame.
         */
        const settled = mixHex(glass, "#ffffff", 0.86);
        rect(wx, 14, WINDOW.w, 1, settled);
        px(wx, 13, settled);
        px(wx + WINDOW.w - 1, 13, settled);
        px(wx + 4, 13, settled);
      }
      if (season === "spring") {
        px(wx + 3, wy(8), "#efb0ba");
        px(wx + 13, wy(3), "#f5c5ca");
      } else if (season === "summer") {
        px(wx + 3, wy(8), "#7fa965");
        px(wx + 4, wy(7), "#9bbb76");
        px(wx + 13, wy(8), "#7fa965");
      } else if (season === "autumn") {
        px(wx + 3, wy(3), "#d88945");
        px(wx + 13, wy(7), "#bd633b");
        px(wx + 6, wy(8), "#e0a14d");
      } else {
        rect(wx + 1, wy(8), 7, 1, "#edf0e8");
        rect(wx + 9, wy(8), 7, 1, "#edf0e8");
        px(wx + 4, wy(3), "#f8faf4");
        px(wx + 13, wy(5), "#f8faf4");
      }
      const birding = t - bird.current < BIRD_MS;
      const starAge = t - shootingStar.current;
      const stargazing = !reduce && night && starAge >= 0 && starAge < STAR_MS;
      const constellating = night && t < windowTaps.current.constellationUntil;
      const sunCatching = !reduce && !night && t < windowTaps.current.sunCatcherUntil;
      const aurora = !reduce && night && t < auroraUntil.current;
      if (birding) {
        const hop = Math.floor(t / 380) % 2;
        blit(BIRD, wx + 4 + hop * 3, 16, { w: INK, b: "#8a6a48", o: "#e0a03f" });
        /*
         * She chatters at it. Once per visit, a beat after it lands, and never while she is asleep.
         *
         * The bird has hopped on that sill since the beginning and she has watched it in silence the
         * whole time. This is the noise a cat makes at something it cannot get to, and it is the only
         * sound in here she makes at something that is not one of you.
         */
        if (!reduce && sc.sleepy < 0.6 && chattered.current !== bird.current && t - bird.current > 500) {
          chattered.current = bird.current;
          play("chatter");
        }
      }
      if (night) {
        // prettier-ignore
        const moonRows = [[1, 3], [0, 4], [0, 4], [0, 4], [1, 3]] as const;
        for (let my = 0; my < moonRows.length; my++) {
          const [start, end] = moonRows[my]!;
          for (let mx = start; mx <= end; mx++) {
            if (moonPixelLit(lunar.index, mx)) px(wx + 2 + mx, wy(my + 1), "#f4e6b8");
          }
        }
        // prettier-ignore
        for (const [sx, sy, ph] of [[12, 2, 0], [14, 6, 0.45], [10, 7, 0.8], [7, 8, 0.25]] as const) {
          if (reduce || Math.sin(t / 900 + ph * 7) > -0.35) px(wx + sx, wy(sy), "#fff6dc");
        }
        if (stargazing) {
          const p = starAge / STAR_MS;
          const sx = Math.round(wx + 14 - p * 10);
          const sy = Math.round(wy(1) + p * 7);
          const a = 1 - p * 0.45;
          px(sx, sy, `rgba(255,246,202,${a})`);
          px(sx + 1, sy - 1, `rgba(255,235,170,${a * 0.8})`);
          px(sx + 2, sy - 2, `rgba(255,226,150,${a * 0.45})`);
          px(sx + 3, sy - 3, `rgba(255,226,150,${a * 0.2})`);
        }
        if (constellating) {
          const fade = Math.min(1, (windowTaps.current.constellationUntil - t) / 800);
          const c = `rgba(255,239,180,${fade})`;
          // prettier-ignore
          const points = lunar.index === 4
            ? [[7, 7], [6, 5], [8, 6], [10, 6], [12, 5], [11, 7], [9, 8]] as const
            : [[4, 7], [7, 5], [10, 7], [13, 3]] as const;
          for (const [sx, sy] of points) px(wx + sx, wy(sy), c);
          // prettier-ignore
          const joins = lunar.index === 4
            ? [[7, 6], [9, 6], [11, 6], [8, 8], [10, 8]] as const
            : [[5, 7], [6, 6], [8, 5], [9, 6], [11, 6], [12, 4]] as const;
          for (const [sx, sy] of joins) {
            px(wx + sx, wy(sy), `rgba(255,226,150,${fade * 0.55})`);
          }
        }
        if (aurora) {
          const fade = Math.min(1, (auroraUntil.current - t) / 900);
          for (let row = 1; row < 9; row++) {
            const drift = Math.round(Math.sin(t / 520 + row * 0.85) * 3);
            const start = 3 + ((row + drift + 12) % 5);
            const color =
              row % 2 === 0 ? `rgba(126,216,180,${fade * 0.7})` : `rgba(173,141,230,${fade * 0.55})`;
            for (let col = start; col < 15; col += 3) px(wx + col, wy(row), color);
          }
        }
      }
      if (windowLightRef.current) {
        const pulse = 0.72 + Math.sin(t / 520) * 0.2;
        const c = `rgba(255,226,139,${pulse})`;
        const lx = wx + 12;
        const ly = wy(5);
        px(lx, ly, "#fff8d8");
        px(lx - 1, ly, c);
        px(lx + 1, ly, c);
        px(lx, ly - 1, c);
        px(lx, ly + 1, c);
        if (Math.sin(t / 700) > 0.35) {
          px(lx - 2, ly, `rgba(255,226,139,${pulse * 0.42})`);
          px(lx + 2, ly, `rgba(255,226,139,${pulse * 0.42})`);
        }
      }
      const lightTouchAge = t - windowLightTouchedAt.current;
      if (!reduce && lightTouchAge >= 0 && lightTouchAge < WINDOW_LIGHT_SEND_MS) {
        const p = lightTouchAge / WINDOW_LIGHT_SEND_MS;
        const a = Math.sin(Math.min(1, p) * Math.PI) * 0.85;
        const lx = wx + 4 + Math.round(p * 8);
        const ly = wy(8) - Math.round(Math.sin(p * Math.PI) * 5);
        px(lx, ly, `rgba(255,248,211,${a})`);
        px(lx - 1, ly, `rgba(255,219,128,${a * 0.72})`);
        px(lx + 1, ly, `rgba(255,219,128,${a * 0.72})`);
        px(lx, ly - 1, `rgba(255,232,164,${a * 0.72})`);
        px(lx, ly + 1, `rgba(255,232,164,${a * 0.72})`);
      }

      // prettier-ignore
      const keptStars = [[3, 7], [6, 3], [9, 7], [12, 3], [14, 7], [8, 5]] as const;
      for (let index = 0; index < constellation.current.found.size; index++) {
        const [sx, sy] = keptStars[index]!;
        const glow = 0.58 + Math.sin(t / 720 + index * 1.7) * 0.18;
        px(wx + sx, wy(sy), `rgba(255,232,166,${glow})`);
      }

      const starFlight = constellation.current.flight;
      if (starFlight) {
        const age = t - starFlight.startedAt;
        if (age >= 0 && age < STAR_FLIGHT_MS) {
          const raw = reduce ? 1 : age / STAR_FLIGHT_MS;
          const p = 1 - Math.pow(1 - raw, 3);
          const targetX = Math.max(cam + 12, Math.min(cam + VW - 12, catX.current ?? WIN_CX));
          const x = Math.round(starFlight.fromX + (targetX - starFlight.fromX) * p);
          const y = Math.round(starFlight.fromY + (9 - starFlight.fromY) * p - Math.sin(p * Math.PI) * 6);
          const c = `rgba(255,236,177,${Math.min(1, 0.45 + p)})`;
          px(x, y, "#fff9dc");
          px(x - 1, y, c);
          px(x + 1, y, c);
          px(x, y - 1, c);
          px(x, y + 1, c);
        }
      }

      if (t < constellation.current.rewardUntil) {
        const remaining = constellation.current.rewardUntil - t;
        const fade = Math.min(1, (CONSTELLATION_REWARD_MS - remaining) / 700, remaining / 900);
        const cx = Math.round(Math.max(cam + 12, Math.min(cam + VW - 12, catX.current ?? WIN_CX)));
        const cy = 10;
        // prettier-ignore
        const points = [[-8, 0], [-7, -4], [-3, -2], [0, -3], [3, -2], [7, -4], [8, 0], [6, 3], [3, 5], [0, 6], [-3, 5], [-6, 3], [-3, 1], [3, 1]] as const;
        // prettier-ignore
        const joins = [[-7, -1], [-6, -2], [-5, -2], [-4, -2], [-2, -2], [-1, -3], [1, -3], [2, -2], [4, -2], [5, -2], [6, -2], [7, -1], [7, 1], [5, 4], [4, 4], [2, 5], [1, 5], [-1, 5], [-2, 5], [-4, 4], [-5, 4], [-7, 1]] as const;
        for (const [dx, dy] of joins) px(cx + dx, cy + dy, `rgba(255,222,145,${fade * 0.38})`);
        for (const [dx, dy] of points) px(cx + dx, cy + dy, `rgba(255,246,205,${fade})`);
        px(cx - 2, cy + 1, `rgba(255,246,205,${fade})`);
        px(cx + 2, cy + 1, `rgba(255,246,205,${fade})`);
      }
      if (sunCatching) {
        const remaining = windowTaps.current.sunCatcherUntil - t;
        const a = Math.min(1, remaining / 550) * 0.62;
        const colors = [
          `rgba(232,150,144,${a})`,
          `rgba(236,191,104,${a})`,
          `rgba(139,187,139,${a})`,
          `rgba(137,164,215,${a})`,
        ];
        for (let i = 0; i < colors.length; i++) {
          const x = WIN_CX - 8 + i * 5 + Math.round(Math.sin(t / 480 + i) * 1);
          rect(x, 25 + i, 3, 1, colors[i]!);
          px(x + 1, FLOOR + 8 + i * 2, colors[i]!);
        }
      }
      const rainbowing = !reduce && rainRemaining <= 0 && t < plantTaps.current.rainbowUntil;
      const plantBlooming =
        !reduce && t >= plantTaps.current.rainbowUntil && t < plantTaps.current.bloomUntil;
      if (!reduce && rainRemaining > 0) {
        const drift = Math.floor(t / 90);
        const a = Math.min(1, rainRemaining / 750);
        for (let i = 0; i < 8; i++) {
          const rx = wx + 2 + ((i * 5 + drift) % 12);
          const ry = wy(1) + ((i * 3 + Math.floor(t / 170)) % 8);
          px(rx, ry, night ? `rgba(157,178,216,${a})` : `rgba(141,180,199,${a})`);
          px(rx - 1, ry + 1, night ? `rgba(111,136,178,${a})` : `rgba(111,157,173,${a})`);
        }
        if (Math.floor(t / 1700) % 3 === 0 && t % 1700 < 90) {
          px(wx + 11, wy(2), `rgba(255,248,210,${a})`);
          px(wx + 10, wy(3), `rgba(255,248,210,${a})`);
          px(wx + 11, wy(4), `rgba(255,248,210,${a})`);
          px(wx + 10, wy(5), `rgba(255,248,210,${a})`);
          px(wx + 9, wy(6), `rgba(255,248,210,${a * 0.7})`);
          px(wx + 9, wy(7), `rgba(255,248,210,${a * 0.45})`);
          px(wx + 8, wy(8), `rgba(255,248,210,${a * 0.25})`);
        }
      }
      if (rainbowing) {
        const a = Math.min(1, (plantTaps.current.rainbowUntil - t) / 500);
        const colors = [
          `rgba(232,137,122,${a})`,
          `rgba(238,184,91,${a})`,
          `rgba(125,181,119,${a})`,
          `rgba(128,155,213,${a})`,
        ];
        for (let x = 2; x < 15; x++) {
          const curve = Math.floor(Math.abs(x - 8) / 2);
          colors.forEach((color, band) => px(wx + x, wy(1 + band + curve), color));
        }
      }
      if (night) {
        const lampGlow = mixHex(sc.wallBottom, "#d89b65", 0.28);
        dither(79, FLOOR - 32, 20, 12, lampGlow);
      }
      rect(79, FLOOR - 23, 18, 2, mixHex(sc.wallBottom, INK, 0.14));
      blit(SHELF, 80 + shake("shelf"), FLOOR - 24, { w: INK, d: "#8a6a48" });
      rect(92 + shake("shelf"), FLOOR - 28, 2, 4, "#7d6b86");
      rect(94 + shake("shelf"), FLOOR - 29, 2, 5, "#b87868");
      if (night) {
        rect(88, FLOOR - 30, 4, 1, INK);
        rect(87, FLOOR - 29, 6, 2, "#d59461");
        rect(89, FLOOR - 27, 2, 3, INK);
        px(89, FLOOR - 29, "#ffd79a");
        px(90, FLOOR - 29, "#ffd79a");
      }
      if (downRef.current) {
        blit(MUG_DOWN, MUG_FLOOR_X, MUG_FLOOR_Y, { w: INK, c: "#cfe0e4", d: "#a9c2c8" });
      } else {
        blit(MUG, 84 + shake("shelf"), FLOOR - 29, { w: INK, c: "#cfe0e4", d: "#a9c2c8" });
        const steamAge = t - mugSteamedAt.current;
        if (!reduce && steamAge >= 0 && steamAge < MUG_STEAM_MS) {
          const p = steamAge / MUG_STEAM_MS;
          const a = (1 - p) * 0.55;
          for (let i = 0; i < 2; i++) {
            const sx = 87 + i * 3 + Math.round(Math.sin(t / 180 + i) * 1);
            const sy = FLOOR - 31 - Math.round(p * 7) - i;
            px(sx, sy, `rgba(255,253,235,${a})`);
            px(sx + 1, sy - 1, `rgba(255,253,235,${a * 0.45})`);
          }
        }
        const mugGlowRemaining = mugTaps.current.glowUntil - t;
        if (!reduce && mugGlowRemaining > 0) {
          const a = Math.min(1, mugGlowRemaining / 500);
          // prettier-ignore
          for (const [dx, dy, opacity] of [[-2, -1, 0.18], [5, -2, 0.26], [8, 1, 0.14], [1, -4, 0.16]] as const) {
            px(87 + dx, FLOOR - 28 + dy, `rgba(255,220,157,${a * opacity})`);
          }
        }
      }
      {
        const prog = doorProg;
        const dx = 6 + shake("door");
        blit(DOOR_FRAMES[Math.round(prog)] ?? DOOR, dx, FLOOR - 16, {
          w: INK,
          f: sc.wallBottom,
          d: "#8a6a48",
          h: "#ffe9a8",
          o: "#fff8e8",
        });
        const ajar = prog / 3;
        if (ajar > 0.05) {
          const cxd = dx + 6;
          for (let i = 0; i < 8; i++) {
            const w = Math.round((5 + i * 1.6) * ajar);
            if (w > 0) rect(cxd - (w >> 1), FLOOR + 1 + i, w, 1, "#fff1cf");
          }
          dither(cxd - 12, FLOOR + 4, 24, 7, "#fff1cf");
        }
      }
      const noteRemaining = doorTaps.current.noteUntil - t;
      if (!reduce && noteRemaining > 0) {
        const p = 1 - noteRemaining / DOOR_NOTE_MS;
        const nx = Math.round(8 + Math.min(1, p * 2.8) * 13);
        const ny = FLOOR + 12;
        const a = Math.min(1, noteRemaining / 500);
        const paper = `rgba(255,248,223,${a})`;
        rect(nx, ny, 6, 4, paper);
        rect(nx, ny, 6, 1, INK);
        rect(nx, ny + 3, 6, 1, INK);
        px(nx, ny + 1, INK);
        px(nx + 5, ny + 2, INK);
        px(nx + 2, ny + 1, `rgba(198,154,99,${a})`);
      }
      rect(18, 14, FRAME.w, FRAME.h, mixHex(sc.wallBottom, INK, 0.12));
      const fx = 16 + shake("frame");
      const drawn = doodleRef.current;
      if (drawn) {
        blit(FRAME_EMPTY, fx, 12, { w: INK, f: "#c69a63", h: "#cfe0e4" });
        for (let dy = 0; dy < FRAME_HOLE.h; dy++) {
          for (let dx = 0; dx < FRAME_HOLE.w; dx++) {
            const ink = DOODLE_INK[cellAt(drawn, dx, dy)];
            if (ink) px(fx + FRAME_HOLE.x + dx, 12 + FRAME_HOLE.y + dy, ink);
          }
        }
      } else if (framedRef.current) {
        blit(FRAME_CAT, fx, 12, {
          w: INK,
          f: "#c69a63",
          h: "#cfe0e4",
          c: L.fur,
          e: INK,
          n: PINK,
        });
      } else {
        blit(FRAME, fx, 12, { w: INK, f: "#c69a63", h: "#cfe0e4", g: "#e2926f" });
      }
      const glintAge = t - photoGlint.current;
      if (!reduce && framedRef.current && glintAge >= 0 && glintAge < PHOTO_GLINT_MS) {
        const p = glintAge / PHOTO_GLINT_MS;
        const gx = Math.round(29 + p * 4);
        const gy = Math.round(15 + p * 5);
        const a = 1 - p;
        px(gx, gy, `rgba(255,253,230,${a})`);
        px(gx - 1, gy, `rgba(255,253,230,${a * 0.55})`);
        px(gx + 1, gy, `rgba(255,253,230,${a * 0.55})`);
        px(gx, gy - 1, `rgba(255,253,230,${a * 0.55})`);
        px(gx, gy + 1, `rgba(255,253,230,${a * 0.55})`);
      }
      const memoryRemaining = photoTaps.current.memoryUntil - t;
      if (!reduce && framedRef.current && memoryRemaining > 0) {
        const p = 1 - memoryRemaining / PHOTO_MEMORY_MS;
        const a = Math.min(1, memoryRemaining / 500);
        for (let i = 0; i < 3; i++) {
          const hx = 21 + i * 4 + Math.round(Math.sin(t / 260 + i) * 1);
          const hy = 11 - Math.round(p * 9) + (i % 2);
          const c = `rgba(240,174,180,${a * (0.8 - i * 0.12)})`;
          px(hx, hy, c);
          px(hx + 2, hy, c);
          px(hx + 1, hy + 1, c);
          px(hx + 1, hy + 2, c);
        }
      }
      const hangingX = 48 + (!reduce ? Math.round(Math.sin(t / 1900)) : 0);
      rect(49, 5, 1, 6, INK);
      px(48, 11, INK);
      px(50, 11, INK);
      rect(hangingX - 2, 12, 6, 3, "#a86f4f");
      rect(hangingX - 1, 15, 4, 1, "#7d523d");
      const hangingLeaf = mixHex(seasonalPlant.leaf, sc.wallTop, night ? 0.22 : 0.08);
      // prettier-ignore
      for (const [dx, dy] of [[-4, -2], [-2, -4], [1, -5], [4, -3], [-5, 1], [5, 0], [-3, 3], [3, 4]] as const) {
        px(hangingX + dx, 12 + dy, hangingLeaf);
        px(hangingX + dx + (dx < 0 ? 1 : -1), 13 + dy, hangingLeaf);
      }

      blit(PLANT, 87 + shake("plant"), FLOOR - 13, { g: seasonalPlant.leaf, w: INK, d: "#b07a4e" });

      const grown = monthsOldRef.current;
      if (grown >= 3) {
        const px2 = (x: number, y: number) => px(x + shake("plant"), y, seasonalPlant.leaf);
        px2(84, FLOOR - 20);
        px2(85, FLOOR - 19);
        px2(94, FLOOR - 21);
        px2(93, FLOOR - 20);
      }
      if (grown >= 8) {
        const px2 = (x: number, y: number) => px(x + shake("plant"), y, seasonalPlant.leaf);
        px2(82, FLOOR - 17);
        px2(83, FLOOR - 18);
        px2(96, FLOOR - 18);
        px2(95, FLOOR - 19);
        px2(89, FLOOR - 24);
        px2(90, FLOOR - 23);
      }
      if (season === "spring") {
        px(91, FLOOR - 19, seasonalPlant.detail);
        px(95, FLOOR - 17, seasonalPlant.detail);
      } else if (season === "winter") {
        px(90, FLOOR - 18, seasonalPlant.detail);
        px(94, FLOOR - 19, seasonalPlant.detail);
      }
      if (plantBlooming) {
        const a = Math.min(1, (plantTaps.current.bloomUntil - t) / 700);
        const c = `rgba(236,151,169,${a})`;
        px(93, FLOOR - 16, c);
        px(92, FLOOR - 15, c);
        px(94, FLOOR - 15, c);
        px(93, FLOOR - 14, "#e7c75f");
      }
      const leafAge = t - fallingLeaf.current;
      if (!reduce && leafAge >= 0 && leafAge < LEAF_FALL_MS) {
        const p = leafAge / LEAF_FALL_MS;
        const lx = Math.round(93 + Math.sin(p * Math.PI * 2) * 3);
        const ly = Math.round(FLOOR - 16 + p * 22);
        px(lx, ly, seasonalPlant.detail);
        if (season !== "spring" && season !== "winter") {
          px(lx + (p < 0.5 ? 1 : -1), ly + 1, seasonalPlant.leaf);
        }
      }
      rect(13, FLOOR + 23, 22, 2, mixHex(sc.floorNear, INK, 0.18));
      // Her blanket. The only thing in the room she picked, so it is drawn from what she chose rather
      // than from a constant, and a room she has not touched keeps the rose it came with.
      const bedPal = blanketPalette(blanketRef.current?.key ?? null);
      blit(BED, 24 + shake("bed"), FLOOR + 22, bedPal);
      if (blanketRef.current?.stripe) {
        // Columns picked by hand, not stepped by a loop. The cushion runs 3 to 16, so an even step
        // leaves a half-width gap at one end, and on a bed that is symmetrical the eye reads that as
        // a mistake rather than a pattern. These four sit evenly and mirror about the middle.
        const bx = 24 + shake("bed") + BED.ox;
        for (const i of BED_STRIPES) {
          for (let j = 0; j < BED.h; j++) {
            if (BED.rows[j]![i] === "b") px(bx + i, FLOOR + 22 + BED.oy + j, bedPal.d!);
          }
        }
      }

      if (cakeRef.current) {
        const flame = reduce || Math.sin(t / 260) > -0.4 ? "#ffca6b" : "#ffe6a8";
        blit(CAKE, 42, FLOOR + 20, { d: "#e8d3b0", g: "#f0a6b4", r: flame });
      }
      if (broughtRef.current) {
        blit(BROUGHT, 24, FLOOR + 22, { r: "#c26a80", h: "#f0b9c4" });
      }

      if (brushedRef.current) {
        blit(TUFT, 48, FLOOR + 22, { f: mixHex(L.fur, "#ffffff", 0.25) });
      }

      if (satWithRef.current) {
        const dent = mixHex(sc.floorNear, INK, 0.13);
        const dentLip = mixHex(sc.floorNear, sc.beamWarm, 0.16);
        rect(36, FLOOR + 21, 9, 1, dentLip);
        rect(35, FLOOR + 22, 11, 2, dent);
        rect(36, FLOOR + 24, 9, 1, dent);
      }

      const g0 = giftRef.current;
      if (g0) {
        const sp0 = g0 === "leaf" ? GIFT_LEAF : g0 === "cap" ? GIFT_CAP : GIFT_MOTH;
        blit(sp0, 17, FLOOR + 16, { w: INK, g: "#7d9e63", r: "#5d7a46", m: "#b9b3a4", n: "#cbbfa6" });
        const giftAge = t - giftGlint.current;
        if (!reduce && giftAge >= 0 && giftAge < PHOTO_GLINT_MS) {
          const p = giftAge / PHOTO_GLINT_MS;
          const c = `rgba(255,242,184,${1 - p})`;
          const gx = 20 + Math.round(p * 2);
          const gy = FLOOR + 15 - Math.round(p * 3);
          px(gx, gy, c);
          px(gx - 1, gy, c);
          px(gx + 1, gy, c);
          px(gx, gy - 1, c);
          px(gx, gy + 1, c);
        }
        const wishRemaining = giftTaps.current.wishUntil - t;
        if (!reduce && wishRemaining > 0) {
          const p = 1 - wishRemaining / GIFT_WISH_MS;
          const a = Math.min(1, wishRemaining / 500);
          for (let i = 0; i < 4; i++) {
            const sx = 18 + i * 2 + Math.round(Math.sin(t / 230 + i) * 1);
            const sy = FLOOR + 15 - Math.round(p * (8 + i));
            px(sx, sy, `rgba(255,224,150,${a * (0.75 - i * 0.1)})`);
          }
        }
      }
      const boxHere = boxRef.current || t < secretBoxUntil.current;
      const inBox = boxHere && !sc.atDoor;
      const peeking = !reduce && boxHere && t < boxPeekUntil.current;
      const boxPlaying = !reduce && boxHere && t < boxTaps.current.playUntil;
      if (boxHere) {
        blit(BOX_BACK, BOX_X + shake("box"), BOX_Y, { w: INK, k: "#c69a63", s: "#a97f4d" });
      }

      if (!reduce) {
        for (const m of motes) {
          m.y -= m.sp;
          if (m.y < 14) {
            m.y = FLOOR - 1;
            m.dx = Math.floor(Math.random() * 15) - 7;
          }
          if (sc.sun > 0.25) {
            const k = Math.max(0, (m.y - 14) / (FLOOR - 14));
            const cx = Math.round(WIN_CX + (beamX - WIN_CX) * k);
            px(cx + m.dx, Math.floor(m.y), sc.beamWarm);
          }
        }
      }

      const roomPartyRemaining = roomTour.current.partyUntil - t;
      if (!reduce && roomPartyRemaining > 0) {
        const p = 1 - roomPartyRemaining / ROOM_TOUR_MS;
        const a = Math.min(1, roomPartyRemaining / 650);
        // prettier-ignore
        const colors = [[240, 174, 180], [255, 227, 155], [169, 207, 145], [174, 191, 232]] as const;
        for (let i = 0; i < 10; i++) {
          const sx = 8 + i * 9 + Math.round(Math.sin(t / 280 + i) * 2);
          const sy = FLOOR + 24 - Math.round(((p + i * 0.13) % 1) * 40);
          const [r, green, b] = colors[i % colors.length]!;
          px(sx, sy, `rgba(${r},${green},${b},${a})`);
          if (i % 3 === 0) px(sx + 1, sy, `rgba(${r},${green},${b},${a * 0.6})`);
        }
      }

      if (zoom.current.next === 0) zoom.current.next = t + 45_000 + Math.random() * 75_000;
      const zooming = t - zoom.current.start < ZOOM_MS;
      if (!zooming && t > zoom.current.next && !sc.atDoor && !reduce) {
        zoom.current.start = t;
        zoom.current.next = t + 120_000 + Math.random() * 120_000;
      }

      const zp = (t - zoom.current.start) / ZOOM_MS;
      const nesting = t < bedNestUntil.current && !sc.atDoor && !zooming;
      const laserPlaying = !reduce && t < laser.current.until && !sc.atDoor;
      const summoning = !reduce && t < summonUntil.current && !sc.atDoor;
      const yarnPlaying = !reduce && t < yarnUntil.current && !sc.atDoor;
      const treating = t < treatUntil.current && !sc.atDoor;
      const treatProgress = treating ? 1 - (treatUntil.current - t) / TREAT_MS : 0;
      const catnipActive = t < catnipUntil.current && !sc.atDoor;
      const catnipping = catnipActive && !reduce;
      const catnipProgress = catnipActive ? 1 - (catnipUntil.current - t) / CATNIP_MS : 0;
      const catnipX = reduce
        ? CATNIP_X
        : 12 + (Math.sin(catnipProgress * Math.PI * 6 - Math.PI / 2) * 0.5 + 0.5) * (GW - 28);
      const musicPlaying = t < music.current.until && !sc.atDoor;
      const musicDancing = musicPlaying && !reduce;
      const mouseMoment =
        reduce && t - mouseStartedAt.current < MOUSE_MS
          ? { x: 72, y: FLOOR + 17, presence: 1, phase: "peek" as const }
          : mouseRunAt(t - mouseStartedAt.current, MOUSE_MS);
      const mouseVisiting = mouseMoment !== null && !sc.atDoor;
      const mouseChasing = mouseVisiting && !reduce && mouseMoment.phase !== "peek";
      const bubbleElapsed = t - bubbleGame.current.startedAt;
      const liveBubbles = bubbleGame.current.seeds.flatMap((seed, index) => {
        if (bubbleGame.current.popped.has(index)) return [];
        const moment = bubbleMomentAt(seed, bubbleElapsed, reduce);
        return moment ? [{ ...moment, index }] : [];
      });
      const bubblePlaying = liveBubbles.length > 0 && !sc.atDoor;
      const bubbleTarget = liveBubbles[0] ?? null;
      const bubbleRewarding = t - bubbleGame.current.completedAt < BUBBLE_REWARD_MS;
      const pianoPlaying = t < pianoGame.current.until && !sc.atDoor;
      const pianoKeysNow = pianoPlaying ? pianoKeys(pianoGame.current.center) : [];
      const pianoPawing = pianoPlaying && t - pianoGame.current.lastAt < 520;
      const pianoRewarding = t < pianoGame.current.rewardUntil;
      const nameCalled = t < nameCallUntil.current;
      const yarnProgress = yarnPlaying ? 1 - (yarnUntil.current - t) / YARN_MS : 0;
      const yarnLap = (yarnProgress * 2) % 2;
      const yarnAcross = yarnLap <= 1 ? yarnLap : 2 - yarnLap;
      const yarnX = 13 + yarnAcross * (GW - 26);
      const followingLight = Math.abs(sc.catX - sc.beam) < 0.001;
      if (!followingLight) warmSpot.current = null;
      const shade = season === "summer" ? (sc.beam > 0.5 ? -SUMMER_SHADE : SUMMER_SHADE) : 0;
      const warmSeat = (target: number): number => {
        const held = warmSpot.current;
        if (held === null || Math.abs(target - held) > LEAVING_WARMTH) warmSpot.current = target;
        return (warmSpot.current ?? target) + shade;
      };

      let wantX = nameCalled
        ? GW / 2
        : bubblePlaying
          ? bubbleTarget!.x
          : mouseChasing
            ? Math.max(12, mouseMoment!.x - 8)
            : musicPlaying
              ? music.current.x
              : catnipActive
                ? catnipX
                : zooming
                  ? 10 + (Math.sin(zp * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5) * (GW - 34)
                  : laserPlaying
                    ? laser.current.x
                    : yarnPlaying
                      ? yarnX
                      : treating
                        ? TREAT_X
                        : inBox
                          ? BOX_X + 2
                          : nesting
                            ? 24
                            : followingLight
                              ? warmSeat(sc.catX * GW)
                              : sc.catX * GW;
      const bounded = (x: number) => Math.max(CAT_REACH_LEFT, Math.min(GW - CAT_REACH_RIGHT, x));
      wantX = bounded(wantX);
      if (catX.current === null) catX.current = firstEverRef.current ? 19 : wantX;
      catX.current += (wantX - catX.current) * (catnipping || zooming || mouseChasing ? 0.4 : 0.05);
      const kx = Math.round(catX.current);

      const m = reduce ? null : mothAt(t, beamX);
      const mothVisit = Math.floor(t / MOTH_CYCLE_MS);
      if (
        m &&
        sc.sun > 0.15 &&
        sc.sleepy < 0.5 &&
        mothSwipe.current.visit !== mothVisit &&
        m.presence > 0.6 &&
        Math.abs(m.x - kx) < 7
      ) {
        mothSwipe.current = { visit: mothVisit, at: t };
        play("chirp");
      }
      const swiping = t - mothSwipe.current.at < SWIPE_MS;

      if (!reduce) {
        if (steppedFrom.current === null) steppedFrom.current = kx;
        else if (Math.abs(kx - steppedFrom.current) >= 4) {
          steps.current.push({ x: kx, at: t });
          steppedFrom.current = kx;
        }
      }
      steps.current = steps.current.filter((p) => t - p.at < STEP_FADE_MS);
      const settledInBed = sc.inBed || (nesting && Math.abs(kx - 24) < 8);
      const ky = FLOOR + 19 + (settledInBed ? 6 : 0);

      const want = ptr.in ? Math.max(0, 1 - Math.hypot(ptr.x - kx, ptr.y - (ky - 8)) / 44) : 0;
      near.current += (want - near.current) * 0.07;
      const n = near.current;
      const pet = petting.current;
      bounce.current = Math.max(0, bounce.current - 0.02);

      petDepth.current = Math.max(0, Math.min(1, petDepth.current + (pet ? 0.006 : -0.003)));

      stayDepth.current = Math.max(
        0,
        Math.min(1, stayDepth.current + (stayingRef.current ? 0.0016 : -0.004)),
      );
      const staySettled = stayDepth.current > 0.2;
      if (!staySettled) stayPurred.current = false;
      else if (!stayPurred.current) {
        stayPurred.current = true;
        play("purr");
      }

      /*
       * The one thing she will not do for one person.
       *
       * Sitting with her long enough is already worth a purr. Doing it while the other one is also in
       * the room gets her all the way over, which is the thing a cat does when it has decided nothing
       * in here is a problem. Deeper than the purr on purpose, so it is not the first thing that
       * happens; the room has to have been quiet for a while.
       */
      const flopped = togetherRef.current && stayDepth.current > 0.62;
      if (flopped && !bellyFound.current) {
        bellyFound.current = true;
        onFoundRef.current?.("belly");
        play("mrrp");
      }
      if (!togetherRef.current || stayDepth.current < 0.2) bellyFound.current = false;
      const settledNow = Math.max(sc.sleepy, petDepth.current, stayDepth.current * 0.75);
      if (Math.abs(settledNow - toldVoice.current) > 0.04) {
        toldVoice.current = settledNow;
        setVoice({ settled: settledNow });
      }

      const quietAndClose = ptr.in && Math.hypot(ptr.x - kx, ptr.y - (ky - 8)) < 15;
      if (!quietAndClose) slowBlink.current.answered = false;
      if (
        quietAndClose &&
        !slowBlink.current.answered &&
        t >= slowBlink.current.until &&
        t - ptr.stillSince >= SLOW_BLINK_WAIT_MS
      ) {
        slowBlink.current.answered = true;
        slowBlink.current.until = t + SLOW_BLINK_MS;
        play("purr");
      }
      if (!togetherRef.current) slowBlink.current.greeted = false;
      if (togetherRef.current && !slowBlink.current.greeted && t >= slowBlink.current.until) {
        slowBlink.current.greeted = true;
        slowBlink.current.until = t + SLOW_BLINK_MS;
      }

      const slowBlinking = t < slowBlink.current.until;

      const cyc = t % 5200;
      const blink = !reduce && ((cyc > 3400 && cyc < 3520) || (cyc > 4100 && cyc < 4200));
      const la = lookAt.current;
      const looking = !!la && t < la.until;
      const forced =
        eyesRef.current ||
        nameCalled ||
        mouseVisiting ||
        bubblePlaying ||
        bubbleRewarding ||
        pianoPawing ||
        pianoRewarding ||
        (looking && !reduce) ||
        doorRef.current !== null ||
        musicPlaying ||
        catnipActive ||
        zooming ||
        laserPlaying ||
        yarnPlaying ||
        treating ||
        summoning ||
        birding ||
        stargazing ||
        constellating ||
        sunCatching ||
        rainbowing ||
        plantBlooming ||
        peeking;
      const open = forced ? 1 : pet ? 0 : Math.max(sc.eyes, n);
      const awake = !slowBlinking && (forced || (open > 0.4 && !blink));
      const posed = open > 0.4;
      const noticing =
        (mouseVisiting ||
          doorRef.current !== null ||
          t < watchDoorUntil.current ||
          t < glanceUntil.current ||
          birding ||
          stargazing ||
          constellating ||
          sunCatching ||
          rainbowing ||
          plantBlooming ||
          peeking) &&
        posed;
      const stretchCycle = t % 40_000;
      const stretching =
        !reduce && awake && sc.play < 0.5 && !inBox && Math.abs(wantX - kx) < 2 && stretchCycle < 1400;
      const pouncing = mouseChasing || laserPlaying || swiping;
      const walking = Math.abs(wantX - kx) > 3 && !zooming && !catnipping && !pouncing;
      const pose: Pose =
        boxPlaying || peeking
          ? "peek"
          : stretching
            ? "stretch"
            : pouncing
              ? "pounce"
              : walking
                ? "walk"
                : bubblePlaying ||
                    pianoPawing ||
                    pianoRewarding ||
                    musicDancing ||
                    catnipping ||
                    zooming ||
                    yarnPlaying ||
                    summoning ||
                    (treating && treatProgress < 0.6)
                  ? "play"
                  : musicPlaying || catnipActive || treating
                    ? "sit"
                    : noticing
                      ? "perk"
                      : // Below the games and above the clock: she will not roll over mid-chase, and
                        // once she has, the hour of the day does not get to sit her back up.
                        flopped
                        ? "flop"
                        : (sc.pose ?? (sc.atDoor ? "stand" : posed ? "sit" : "loaf"));
      const sp = POSES[pose]!;

      const breathe = reduce || pose !== "loaf" ? 0 : Math.round(Math.sin(t / 1100));
      const hop =
        Math.round(bounce.current * 3) +
        (musicDancing || (pianoRewarding && !reduce)
          ? Math.round(Math.abs(Math.sin(t / 145)) * 3)
          : reduce || sc.play <= 0.5
            ? 0
            : Math.round(Math.abs(Math.sin(t / 260)) * 2));
      const peekLift = boxPlaying
        ? 4 + Math.round(Math.abs(Math.sin(t / 210)) * 3)
        : peeking
          ? Math.round(Math.sin(((boxPeekUntil.current - t) / 1200) * Math.PI) * 5)
          : 0;
      const y = ky + breathe - hop - peekLift;
      catBox.current = { x0: kx + sp.ox, y0: y + sp.oy, x1: kx + sp.ox + sp.w, y1: y + sp.oy + sp.h };

      const poolHalf = (26 * poolScale) / 2;
      const litSpan =
        sc.lightPhase === "night"
          ? 0
          : Math.max(
              0,
              Math.min(kx + sp.ox + sp.w, beamX + poolHalf) - Math.max(kx + sp.ox, beamX - poolHalf),
            );
      const warmth = (litSpan / sp.w) * sc.sun * 0.24;
      const sunlit = (c: string) => (warmth > 0.01 ? mixHex(c, sc.beamWarm, warmth) : c);

      const pal: Record<string, string> = {
        w: INK,
        f: sunlit(L.fur),
        d: sunlit(L.furDk),
        b: sunlit(L.belly),
        p: PINK,
        n: PINK,
        m: INK,
        c: awake ? BLUSH : "",
        h: awake ? WHITE : "",
        e: awake ? L.eyes : "",
      };

      const activeMood = moodRef.current;
      const moodLeft = kx - 13;
      const moodRight = kx + 11;
      if (activeMood === "sad") {
        rect(moodRight, FLOOR + 17, 8, 1, mixHex(sc.floorNear, INK, 0.2));
        rect(moodRight - 1, FLOOR + 14, 10, 3, "#c99291");
        rect(moodRight + 1, FLOOR + 13, 6, 1, "#ddb0a8");
        px(moodRight + 1, FLOOR + 15, "#b77b7d");
        px(moodRight + 6, FLOOR + 15, "#b77b7d");
      } else if (activeMood === "stressed") {
        rect(moodLeft, FLOOR + 17, 28, 3, "#b68486");
        dither(moodLeft + 2, FLOOR + 18, 24, 1, "#d5aaa0");
        for (const x of [moodLeft + 2, moodLeft + 7, moodLeft + 20, moodLeft + 25]) {
          px(x, FLOOR + 20, "#9d7077");
        }
      } else if (activeMood === "tired") {
        rect(moodRight, FLOOR + 16, 9, 2, "#d3aaa0");
        rect(moodRight + 1, FLOOR + 14, 7, 4, "#e2c0b4");
        px(moodRight + 1, FLOOR + 15, "#bc8d8b");
        px(moodRight + 7, FLOOR + 16, "#bc8d8b");
      } else if (activeMood === "bored") {
        rect(moodLeft + 2, FLOOR + 16, 6, 2, "#c8a77d");
        rect(moodLeft + 1, FLOOR + 15, 2, 2, "#c8a77d");
        px(moodLeft + 3, FLOOR + 15, "#ead5b1");
        px(moodLeft + 8, FLOOR + 18, "#8fa172");
        px(moodLeft + 9, FLOOR + 18, "#8fa172");
      } else if (activeMood === "lonely") {
        rect(7, FLOOR + 16, 5, 2, "#84646b");
        px(8, FLOOR + 15, "#a47b7b");
        rect(12, FLOOR + 17, 5, 2, "#6f5964");
        px(13, FLOOR + 16, "#94737a");
      } else if (activeMood === "feral") {
        const leafHop = reduce ? 0 : Math.round(Math.abs(Math.sin(t / 150)) * 2);
        px(moodRight + 2, FLOOR + 17 - leafHop, "#6f925b");
        px(moodRight + 3, FLOOR + 16 - leafHop, "#8cab69");
        px(moodRight + 4, FLOOR + 17 - leafHop, "#5f824e");
        px(moodRight + 1, FLOOR + 18 - leafHop, "#8f7657");
      } else if (activeMood === "horny") {
        /*
         * A toy she has abandoned on her way to the door.
         *
         * Its shadow was two pixels of the toy's own pink, offset right and a row low, which detached
         * them: on bare boards that reads as a full stop typed onto the floor. Shadows here are a
         * floor-mixed line the width of the thing above them, directly under it, like the sad cushion.
         *
         * Pink, and staying pink. It was the most saturated thing on this floor at 0.40 against 0.24
         * to 0.28 for the cushion, the mat and the blanket, which is most of why a stray pixel of it
         * read as ink. Toned into that band. Not recoloured to the tan of the bored mood's toy: that
         * one gets away with tan because it has a shape, and a plain lump in a cat's room does not.
         */
        rect(19, FLOOR + 20, 5, 1, mixHex(sc.floorNear, INK, 0.2));
        rect(19, FLOOR + 17, 4, 3, "#bd8897");
        px(18, FLOOR + 16, "#dbabb6");
        // Three pixels rising off the bottom corner, each touching the last. A lump on a floor is
        // whatever the person looking at it decides; a lump with a tail is a toy.
        px(23, FLOOR + 19, "#946270");
        px(24, FLOOR + 18, "#946270");
        px(25, FLOOR + 17, "#946270");
      }

      if (treating) {
        const ty = FLOOR + 18;
        if (treatProgress < 0.68) {
          const wiggle = reduce ? 0 : Math.round(Math.sin(t / 95));
          rect(TREAT_X - 2, ty - 1, 5, 3, "#d78761");
          px(TREAT_X - 3, ty + wiggle, "#d78761");
          px(TREAT_X + 3, ty - wiggle, "#d78761");
          px(TREAT_X, ty, "#f2b47e");
        } else {
          px(TREAT_X - 3, ty + 1, "#c87958");
          px(TREAT_X + 2, ty, "#d99a6f");
          px(TREAT_X + 4, ty + 1, "#c87958");
        }
      }
      if (catnipActive && catnipProgress < 0.28) {
        const cy = FLOOR + 18;
        rect(CATNIP_X - 3, cy - 1, 7, 3, "#dbc499");
        px(CATNIP_X - 2, cy - 2, "#6c9b57");
        px(CATNIP_X, cy - 3, "#83ad64");
        px(CATNIP_X + 2, cy - 2, "#5e8d4e");
      }

      if (pianoPlaying) {
        const nextNote = pianoGame.current.history.length;
        for (const key of pianoKeysNow) {
          const pressed = key.index === pianoGame.current.lastKey && t - pianoGame.current.lastAt < 260;
          const fill = pressed ? "#e8a9b5" : key.index % 2 === 0 ? "#f7ead1" : "#efe0c4";
          rect(Math.round(key.x), key.y, key.width, key.height, "#684b32");
          rect(Math.round(key.x) + 1, key.y + 1, key.width - 2, key.height - 2, fill);
          if (key.index === nextNote && !pianoRewarding) {
            const px0 = Math.round(key.x + key.width / 2);
            const py0 = key.y + 5;
            px(px0 - 1, py0, "rgba(104,75,50,.45)");
            px(px0 + 1, py0, "rgba(104,75,50,.45)");
            rect(px0 - 2, py0 + 1, 5, 2, "rgba(104,75,50,.45)");
          }
        }
      }

      if (mouseVisiting) {
        const mx = Math.round(mouseMoment!.x);
        const my = Math.round(mouseMoment!.y);
        const alpha = mouseMoment!.presence;
        const body = `rgba(142,119,99,${alpha})`;
        const ear = `rgba(224,156,158,${alpha})`;
        px(mx - 4, my, body);
        px(mx - 3, my - 1, body);
        px(mx - 2, my - 1, body);
        rect(mx - 1, my - 2, 4, 3, body);
        px(mx + 2, my - 3, ear);
        px(mx + 2, my - 2, `rgba(74,53,32,${alpha})`);
        if (!reduce && mouseMoment!.phase === "dash") {
          px(mx, my + 1, `rgba(116,91,72,${alpha * 0.6})`);
          px(mx + 3, my + 1, `rgba(116,91,72,${alpha * 0.6})`);
        }
      }

      if (sc.moodVisual === "warm-pool") {
        const warmth = mixHex(sc.floorNear, "#f3c985", 0.62);
        // prettier-ignore
        for (const [dy, width] of [[-1, 16], [0, 24], [1, 28], [2, 24], [3, 16]] as const) {
          rect(kx - (width >> 1), ky + dy, width, 1, warmth);
        }
      } else if (sc.moodVisual === "throw") {
        const edge = mixHex(sc.floorNear, "#765d82", 0.7);
        const cloth = mixHex(sc.floorNear, "#b58ca4", 0.72);
        rect(kx + 5, ky - 3, 11, 5, edge);
        rect(kx + 4, ky - 2, 13, 3, cloth);
        px(kx + 6, ky - 1, mixHex(cloth, sc.beamWarm, 0.25));
        px(kx + 14, ky + 2, edge);
      } else if (sc.moodVisual === "door-light" || sc.moodVisual === "exit-line") {
        const glow = sc.moodVisual === "exit-line" ? "#fff0c4" : mixHex(sc.floorFar, "#ffd58f", 0.72);
        rect(8, FLOOR, 8, 1, glow);
        px(7, FLOOR + 1, glow);
        px(16, FLOOR + 1, glow);
        if (sc.moodVisual === "door-light") {
          px(10, FLOOR + 2, mixHex(sc.floorFar, glow, 0.55));
          px(14, FLOOR + 2, mixHex(sc.floorFar, glow, 0.55));
        }
      } else if (sc.moodVisual === "floor-toys") {
        const ballX = kx - 14;
        rect(ballX - 2, ky - 2, 5, 4, INK);
        rect(ballX - 1, ky - 3, 3, 6, "#9a718b");
        px(ballX, ky - 2, "#d1a7bc");
        // prettier-ignore
        for (const [dx, dy] of [[3, 1], [5, 2], [7, 2], [8, 1], [10, 1]] as const) px(ballX + dx, ky + dy, INK);
      }

      for (const step of steps.current) {
        const life = 1 - (t - step.at) / STEP_FADE_MS;
        if (life <= 0) continue;
        const ink = mixHex(sc.floorNear, INK, 0.1 * life);
        px(step.x - 2, ky + 2, ink);
        px(step.x + 2, ky + 2, ink);
      }

      const lean = (beamX - WIN_CX) / GW;
      const cast = Math.round(lean * 7 * Math.min(1, sc.sun * 1.4));
      const shadowX = kx - (sp.w >> 1);
      rect(shadowX + 1, ky + 1, sp.w - 2, 1, mixHex(sc.floorNear, INK, 0.1));
      rect(shadowX + 3 + Math.round(cast * 0.5), ky + 2, sp.w - 6, 1, mixHex(sc.floorNear, INK, 0.2));
      rect(shadowX + 6 + cast, ky + 3, sp.w - 12, 1, mixHex(sc.floorNear, INK, 0.12));

      const wag = reduce ? 0 : Math.round(Math.sin(t / (620 - sc.play * 380)) * (1 + sc.play * 2 + n));
      const tailX =
        pose === "loaf" ? kx + 8 : pose === "stretch" ? kx + 14 : pose === "pounce" ? kx + 9 : kx + 5;
      const tailY = pose === "loaf" ? y - 4 : pose === "perk" ? y - 9 : y - 6;
      if (pose !== "peek") blit(TAIL, pose === "stand" ? kx - 12 : tailX, tailY + wag, pal, pose === "stand");
      blit(sp, kx, y, pal);

      if (bothCalledRef.current) {
        const c = COLLAR[pose];
        rect(kx + c.dx, y + c.dy, c.w, 1, sunlit(COLLAR_BAND));
        px(kx + c.tag, y + c.dy, sunlit(COLLAR_TAG));
      }

      if (warmth > 0.06) {
        const rimOnLeft = beamX > WIN_CX;
        const rim = mixHex(sc.beamWarm, WHITE, 0.4);
        for (let j = 0; j < sp.h; j++) {
          const row = sp.rows[j]!;
          let edge = -1;
          if (rimOnLeft) {
            for (let i = 0; i < sp.w; i++)
              if (row[i] !== ".") {
                edge = i;
                break;
              }
          } else {
            for (let i = sp.w - 1; i >= 0; i--)
              if (row[i] !== ".") {
                edge = i;
                break;
              }
          }
          if (edge >= 0) px(kx + sp.ox + edge, y + sp.oy + j, rim);
        }
      }
      /*
       * She washes when nothing else is happening, which is most of what a cat does with its day.
       *
       * Not while she is sleepy, not while she is being held, and never at the same time as a yawn:
       * two overlays on one small face at once is a smudge, not two behaviours.
       */
      if (
        !reduce &&
        awake &&
        sc.sleepy < 0.5 &&
        !pet &&
        stayDepth.current < 0.2 &&
        t - yawn.current.at > YAWN_MS + 600 &&
        t > groom.current.next
      ) {
        groom.current.at = t;
        groom.current.next = t + 52000 + Math.random() * 60000;
      }
      /*
       * She makes biscuits while you hold her, once she has settled right down.
       *
       * Deeper than the purr and shallower than the flop, so the order you get them in is purr, then
       * kneading, then over she goes. Alternating, because both paws at once is a hop.
       */
      if (pose === "loaf" && !reduce && stayDepth.current > 0.34 && awake) {
        const beat = Math.floor(t / KNEAD_BEAT_MS) % 2;
        const paws = y + sp.oy + KNEAD.y;
        rect(kx + sp.ox + KNEAD.left, paws - (beat ? 1 : 0), KNEAD.w, 1, L.furDk);
        rect(kx + sp.ox + KNEAD.right, paws - (beat ? 0 : 1), KNEAD.w, 1, L.furDk);
      }

      // Ears move constantly on a real cat and never once moved on this one. Rare enough to read as
      // a twitch rather than a tic, and either ear, because a cat that always flicks the same one is a
      // cat with something wrong with it.
      if (!reduce && awake && t > earFlick.current.next) {
        earFlick.current = {
          at: t,
          next: t + 7000 + Math.random() * 15000,
          side: Math.random() < 0.5 ? 1 : -1,
        };
      }
      if (!reduce && awake && t - earFlick.current.at < EAR_FLICK_MS) {
        const ex = earFlick.current.side > 0 ? EAR.right : EAR.left;
        px(kx + sp.ox + ex, y + sp.oy + EAR.y, INK);
      }

      const grooming = t - groom.current.at < GROOM_MS;
      if (grooming && awake) {
        const faceX = kx + sp.ox;
        const faceY = y + sp.oy;
        rect(faceX + GROOM.pawX, faceY + GROOM.pawY, 2, 2, L.fur);
        px(faceX + GROOM.tipX, faceY + GROOM.tipY, INK);
        // The tongue comes and goes; the paw stays up. A paw that flickers reads as a glitch.
        if ((t - groom.current.at) % (GROOM_LICK_MS * 2) < GROOM_LICK_MS) {
          px(faceX + GROOM.tongueX, faceY + GROOM.tongueY, PINK);
        }
      }

      if (!reduce && awake && sc.sleepy > 0.25 && sc.sleepy < 0.75 && t > yawn.current.next) {
        yawn.current.at = t;
        yawn.current.next = t + 42000 + Math.random() * 48000;
      }
      const yawning = t - yawn.current.at < YAWN_MS;
      if (yawning && awake) {
        const faceX = kx + sp.ox;
        const jawY = y + sp.oy + YAWN.y;
        rect(faceX + YAWN.x, jawY, YAWN.w, 1, INK);
        rect(faceX + YAWN.x + 1, jawY + 1, YAWN.w - 2, 1, INK);
        px(faceX + YAWN.x + 2, jawY + 1, PINK);
      }

      if (!awake) {
        const eye = CLOSED_EYES[pose];
        const faceX = kx + sp.ox;
        const eyeY = y + sp.oy + eye.y;
        rect(faceX + eye.left, eyeY, eye.width, 1, INK);
        rect(faceX + eye.right, eyeY, eye.width, 1, INK);
      }

      if (sc.moodVisual === "blanket") {
        const blanket = mixHex(sc.floorNear, "#9c7799", 0.72);
        const hem = mixHex(blanket, INK, 0.22);
        rect(kx - 7, y - 6, 15, 5, hem);
        rect(kx - 6, y - 6, 13, 4, blanket);
        for (const x0 of [kx - 5, kx - 1, kx + 3]) px(x0, y - 3, mixHex(blanket, sc.beamWarm, 0.24));
      } else if (sc.moodVisual === "quilt") {
        const rose = mixHex(sc.floorNear, "#c78591", 0.7);
        const sage = mixHex(sc.floorNear, "#83966f", 0.68);
        rect(kx - 7, y - 6, 15, 5, INK);
        for (let row = 0; row < 4; row++) {
          for (let col = 0; col < 13; col++) {
            px(
              kx - 6 + col,
              y - 6 + row,
              (Math.floor(col / 3) + Math.floor(row / 2)) % 2 === 0 ? rose : sage,
            );
          }
        }
        px(kx - 7, y - 1, rose);
        px(kx + 7, y - 1, sage);
      } else if (sc.moodVisual === "paper") {
        for (let i = 0; i < 6; i++) {
          const drift = reduce ? 0 : Math.round(Math.sin(t / 240 + i * 1.7) * 3);
          const lift = reduce ? i % 3 : Math.round(Math.abs(Math.sin(t / 330 + i)) * 9);
          const sx = kx - 18 + i * 7 + drift;
          const sy = ky - 2 - lift - (i % 2) * 3;
          const paper = i % 2 ? "#f6e8cc" : "#ead5d2";
          rect(sx, sy, 3, 2, paper);
          px(sx + (i % 2), sy + 1, mixHex(paper, INK, 0.2));
        }
      }

      for (const bubble of liveBubbles) {
        const bx = Math.round(bubble.x);
        const by = Math.round(bubble.y);
        const edge = `rgba(165,215,232,${bubble.presence * 0.9})`;
        const shine = `rgba(255,255,245,${bubble.presence})`;
        px(bx - 2, by - 1, edge);
        px(bx - 2, by, edge);
        px(bx - 1, by - 2, edge);
        px(bx + 1, by - 2, edge);
        px(bx + 2, by - 1, edge);
        px(bx + 2, by, edge);
        px(bx - 1, by + 2, edge);
        px(bx, by + 2, edge);
        px(bx + 1, by + 1, edge);
        px(bx - 1, by - 1, shine);
        if (Math.floor(t / 280 + bubble.index) % 2 === 0) px(bx, by - 2, shine);
      }
      const lastPop = bubbleGame.current.lastPop;
      if (lastPop && t - lastPop.at < 520) {
        const progress = (t - lastPop.at) / 520;
        const radius = 2 + Math.round(progress * 5);
        const alpha = 1 - progress;
        const sparkle = `rgba(255,245,188,${alpha})`;
        px(Math.round(lastPop.x - radius), Math.round(lastPop.y), sparkle);
        px(Math.round(lastPop.x + radius), Math.round(lastPop.y), sparkle);
        px(Math.round(lastPop.x), Math.round(lastPop.y - radius), sparkle);
        px(Math.round(lastPop.x), Math.round(lastPop.y + radius), sparkle);
      }
      if (bubbleRewarding) {
        const remaining = bubbleGame.current.completedAt + BUBBLE_REWARD_MS - t;
        const fade = Math.min(1, remaining / 500);
        for (let i = 0; i < 5; i++) {
          const angle = i * ((Math.PI * 2) / 5) + (reduce ? 0 : t / 850);
          const hx = Math.round(kx + Math.cos(angle) * 15);
          const hy = Math.round(y - 7 + Math.sin(angle) * 9);
          const heart = `rgba(232,120,140,${fade})`;
          px(hx, hy, heart);
          px(hx + 2, hy, heart);
          rect(hx - 1, hy + 1, 5, 1, heart);
          rect(hx, hy + 2, 3, 1, heart);
          px(hx + 1, hy + 3, heart);
        }
      }
      if (pianoRewarding) {
        const remaining = pianoGame.current.rewardUntil - t;
        const fade = Math.min(1, remaining / 600);
        for (let i = 0; i < 6; i++) {
          const progress = reduce ? i / 6 : (1 - remaining / PIANO_REWARD_MS + i / 6) % 1;
          const nx = Math.round(kx - 15 + i * 6 + Math.sin(t / 260 + i) * (reduce ? 0 : 2));
          const ny = Math.round(y - 4 - progress * 18);
          const note =
            i % 2 === 0
              ? `rgba(232,169,181,${fade * (1 - progress * 0.5)})`
              : `rgba(255,232,143,${fade * (1 - progress * 0.5)})`;
          px(nx, ny, note);
          px(nx, ny + 1, note);
          px(nx + 1, ny, note);
          if (i % 2 === 0) px(nx + 2, ny - 1, note);
        }
      }

      if (nameCalled) {
        const remaining = nameCallUntil.current - t;
        const fade = Math.min(1, remaining / 650);
        const count = reduce ? 1 : 4;
        for (let i = 0; i < count; i++) {
          const p = reduce ? 0.35 : (1 - remaining / NAME_CALL_MS + i / count) % 1;
          const hx = kx - 11 + i * 7 + Math.round(Math.sin(t / 310 + i) * (reduce ? 0 : 2));
          const hy = Math.round(y - 3 - p * 13);
          const a = fade * (reduce ? 0.75 : Math.sin(p * Math.PI));
          const c = `rgba(232,120,140,${a})`;
          px(hx, hy, c);
          px(hx + 2, hy, c);
          rect(hx - 1, hy + 1, 5, 1, c);
          rect(hx, hy + 2, 3, 1, c);
          px(hx + 1, hy + 3, c);
        }
      }
      if (boxHere) {
        blit(BOX_FRONT, BOX_X + shake("box"), BOX_Y + 3, { w: INK, k: "#d8ab72" });
        if (boxPlaying) {
          const bx = BOX_X + shake("box");
          rect(bx + 4, BOX_Y + 3, 3, 2, L.fur);
          rect(bx + 13, BOX_Y + 3, 3, 2, L.fur);
          px(bx + 4, BOX_Y + 3, INK);
          px(bx + 6, BOX_Y + 3, INK);
          px(bx + 13, BOX_Y + 3, INK);
          px(bx + 15, BOX_Y + 3, INK);
          const remaining = boxTaps.current.playUntil - t;
          const fade = Math.min(1, remaining / 450);
          for (let i = 0; i < 5; i++) {
            const phase = (t / 430 + i * 0.73) % 1;
            const fx = bx + 2 + i * 4 + Math.round(Math.sin(t / 180 + i) * 2);
            const fy = BOX_Y + 2 - Math.round(phase * 12);
            px(fx, fy, `rgba(255,238,190,${fade * (1 - phase)})`);
          }
        }
      }

      if (laserPlaying && Math.floor(t / 110) % 2 === 0) {
        const age = 1 - (laser.current.until - t) / LASER_CHASE_MS;
        const lx = Math.round(laser.current.x + Math.sin(t / 130) * 1);
        const ly = Math.round(laser.current.y + Math.sin(t / 180) * 1);
        px(lx, ly, "#ff6b6b");
        px(lx + 1, ly, "rgba(255,161,161,.7)");
        if (age < 0.78) px(lx - 1, ly + 1, "rgba(255,116,116,.35)");
      }
      if (!reduce && laserTrail.current.length > 0) {
        laserTrail.current = laserTrail.current.filter((point) => t - point.at < 520);
        for (const point of laserTrail.current) {
          const opacity = Math.max(0, 1 - (t - point.at) / 520) * 0.42;
          px(Math.round(point.x), Math.round(point.y), `rgba(255,107,107,${opacity})`);
        }
      }
      if (yarnPlaying) {
        const yarnY = FLOOR + 17 - Math.round(Math.abs(Math.sin(yarnProgress * Math.PI * 8)) * 2);
        const yc = "#d78aa0";
        rect(Math.round(yarnX) - 2, yarnY - 1, 5, 3, yc);
        rect(Math.round(yarnX) - 1, yarnY - 2, 3, 5, yc);
        px(Math.round(yarnX) - 1, yarnY - 1, "#a95d76");
        px(Math.round(yarnX) + 1, yarnY + 1, "#efb3c0");
        const direction = yarnLap < 1 ? -1 : 1;
        px(Math.round(yarnX) + direction * 3, yarnY + 1, "#b86c84");
        px(Math.round(yarnX) + direction * 4, yarnY + 2, "#b86c84");
        px(Math.round(yarnX) + direction * 5, yarnY + 2, "#d78aa0");
      }
      if (treating && treatProgress > 0.7 && !reduce) {
        const heartProgress = ((treatProgress - 0.7) / 0.3) % 1;
        const hx = kx + 7;
        const hy = Math.round(y - 7 - heartProgress * 8);
        const alpha = Math.sin(heartProgress * Math.PI);
        const hc = `rgba(232,120,140,${alpha})`;
        px(hx, hy, hc);
        px(hx + 2, hy, hc);
        rect(hx - 1, hy + 1, 5, 1, hc);
        rect(hx, hy + 2, 3, 1, hc);
        px(hx + 1, hy + 3, hc);
      }
      if (catnipping) {
        for (let i = 0; i < 3; i++) {
          const lp = (catnipProgress * 5 + i / 3) % 1;
          const lx = Math.round(kx - 8 + i * 8 + Math.sin(t / 150 + i) * 3);
          const ly = Math.round(y - lp * 15 + 2);
          const lc = i === 1 ? "rgba(131,173,100,.85)" : "rgba(94,141,78,.72)";
          px(lx, ly, lc);
          px(lx + (i % 2 ? 1 : -1), ly + 1, lc);
        }
      }
      if (musicPlaying) {
        const noteCount = reduce ? 2 : 4;
        for (let i = 0; i < noteCount; i++) {
          const np = reduce ? 0.45 + i * 0.12 : (t / 1050 + i / noteCount) % 1;
          const nx = kx - 14 + i * 9 + Math.round(Math.sin(t / 260 + i) * (reduce ? 0 : 2));
          const ny = Math.round(y - 2 - np * 15);
          const alpha = reduce ? 0.7 : Math.sin(np * Math.PI);
          const nc = i % 2 === 0 ? `rgba(126,102,181,${alpha})` : `rgba(232,120,140,${alpha})`;
          rect(nx, ny, 2, 2, nc);
          rect(nx + 1, ny - 4, 1, 5, nc);
          if (i % 2 === 0) px(nx + 2, ny - 4, nc);
        }
      }
      if (floorTap) {
        const age = (t - pk!.at) / 420;
        px(Math.round(ptr.x), FLOOR + 1, `rgba(255,239,183,${1 - age})`);
      }

      if (m && sc.sun > 0.15) {
        const dodge = swiping
          ? Math.round(Math.sin(((t - mothSwipe.current.at) / SWIPE_MS) * Math.PI) * 6)
          : 0;
        const mx = Math.round(m.x),
          my = Math.round(m.y) - dodge;
        const flap = Math.sin(t / 90) > 0 ? 1 : 0;
        const a2 = 0.35 + m.presence * 0.65;
        px(mx, my, `rgba(246,234,208,${a2})`);
        px(mx - 1, my - flap, `rgba(232,214,180,${a2})`);
        px(mx + 1, my - flap, `rgba(232,214,180,${a2})`);
      }

      if (awake) {
        const ey = y + sp.oy + 6;
        const EYES: Record<Pose, { l: number; r: number; wide: boolean }> = {
          loaf: { l: -5, r: 4, wide: true },
          sit: { l: -3, r: 2, wide: true },
          perk: { l: -3, r: 2, wide: true },
          play: { l: -4, r: 3, wide: true },
          stand: { l: -5, r: 1, wide: false },
          walk: { l: -4, r: 2, wide: true },
          stretch: { l: -4, r: 2, wide: true },
          pounce: { l: -5, r: 1, wide: true },
          peek: { l: -4, r: 2, wide: true },
          flop: { l: -5, r: 4, wide: true },
        };
        const e = EYES[pose];
        const at = mouseVisiting
          ? mouseMoment!.x
          : looking
            ? la!.x
            : m && sc.sun > 0.15
              ? m.x
              : ptr.in
                ? ptr.x
                : null;
        const look = !e.wide || at === null ? 0 : Math.sign(at - kx) * (Math.abs(at - kx) > 4 ? 1 : 0);
        px(kx + e.l + look, ey, WHITE);
        px(kx + e.r + look, ey, WHITE);
      }

      if (sc.play > 0.5) {
        px(85, FLOOR + 7, INK);
        px(86, FLOOR + 7, INK);
        px(85, FLOOR + 8, PINK);
        px(86, FLOOR + 8, PINK);
        px(85, FLOOR + 9, INK);
        px(86, FLOOR + 9, INK);
      }

      if (pet) {
        const p = (t / 1100) % 1;
        const hy = Math.round(y + sp.oy - 4 - p * 10);
        const hx = kx + 8;
        const c = `rgba(232,120,140,${1 - p})`;
        px(hx, hy, c);
        px(hx + 2, hy, c);
        rect(hx - 1, hy + 1, 5, 1, c);
        rect(hx, hy + 2, 3, 1, c);
        px(hx + 1, hy + 3, c);
      }

      if (sc.sparkle && !reduce) {
        for (let i = 0; i < 3; i++) {
          const p = (t / 1600 + i / 3) % 1;
          const sx = kx - 14 + i * 13;
          const sy = Math.round(y + sp.oy - 2 - p * 9);
          const c = `rgba(255,236,150,${Math.sin(p * Math.PI)})`;
          px(sx, sy, c);
          px(sx - 1, sy + 1, c);
          px(sx + 1, sy + 1, c);
          px(sx, sy + 2, c);
        }
      }

      if (summoning) {
        const remaining = summonUntil.current - t;
        const fade = Math.min(1, remaining / 650);
        for (let i = 0; i < 6; i++) {
          const phase = t / (520 + i * 35) + i * 1.7;
          const radius = 10 + (i % 3) * 4;
          const sx = Math.round(kx + Math.cos(phase) * radius);
          const sy = Math.round(y - 7 + Math.sin(phase * 1.35) * (5 + (i % 2) * 3));
          const color = i % 2 === 0 ? `rgba(255,232,143,${fade})` : `rgba(240,174,180,${fade * 0.9})`;
          px(sx, sy, color);
          if (Math.floor(t / 140 + i) % 2 === 0) {
            px(sx - 1, sy, color);
            px(sx + 1, sy, color);
          }
        }
      }

      if (!reduce && sc.sun < 0.1) {
        const f = fireflyAt(t);
        if (f) {
          const a = 0.35 + Math.abs(Math.sin(t / 420)) * 0.65 * f.presence;
          const fx = Math.round(f.x),
            fy = Math.round(f.y + 14);
          px(fx, fy, `rgba(255,236,140,${a})`);
          px(fx - 1, fy, `rgba(255,222,110,${a * 0.35})`);
          px(fx + 1, fy, `rgba(255,222,110,${a * 0.35})`);
          px(fx, fy - 1, `rgba(255,222,110,${a * 0.35})`);
        }
      }

      if ((birding || t < speakUntil.current) && !reduce) {
        const BW = 21,
          BH = 8;
        const bx = Math.max(1, Math.min(GW - BW - 1, kx + 4));
        const by = y + sp.oy - 12;
        rect(bx + 1, by, BW - 2, BH, WHITE);
        rect(bx, by + 1, BW, BH - 2, WHITE);
        rect(bx + 1, by, BW - 2, 1, INK);
        rect(bx + 1, by + BH - 1, BW - 2, 1, INK);
        rect(bx, by + 1, 1, BH - 2, INK);
        rect(bx + BW - 1, by + 1, 1, BH - 2, INK);
        px(bx + 4, by + BH, WHITE);
        px(bx + 3, by + BH, INK);
        px(bx + 5, by + BH, INK);
        px(bx + 4, by + BH + 1, INK);
        blit(birding ? EK : MRRP, bx + 2, by + 2, { w: INK });
      }

      const twitch = !reduce && awake && t % 13_000 < 220;
      if (twitch) {
        px(kx + sp.ox + 4, y + sp.oy, sc.wallTop);
        px(kx + sp.ox + 4, y + sp.oy + 1, L.fur);
      }

      if (sc.sleepy > 0.75 && !awake && !reduce) {
        for (let i = 0; i < 3; i++) {
          const p = (t / 3200 + i / 3) % 1;
          const zx = kx + 13 + Math.round(p * 7);
          const zy = Math.round(y + sp.oy - 1 - p * 12);
          const a2 = Math.sin(p * Math.PI) * 0.75;
          const c = sc.sun > 0.3 ? `rgba(104,72,42,${a2 * 0.9})` : `rgba(255,255,255,${a2})`;
          px(zx, zy, c);
          px(zx + 1, zy, c);
          px(zx + 1, zy + 1, c);
          px(zx, zy + 2, c);
          px(zx + 1, zy + 2, c);
        }
      }

      const dreamRemaining = bedTaps.current.dreamUntil - t;
      if (!reduce && dreamRemaining > 0) {
        const p = 1 - dreamRemaining / BED_DREAM_MS;
        const a = Math.min(1, dreamRemaining / 600);
        for (let i = 0; i < 3; i++) {
          const dx = 18 + i * 4 + Math.round(Math.sin(t / 320 + i) * 1);
          const dy = FLOOR + 18 - Math.round(p * (8 + i * 2));
          const c = `rgba(255,239,183,${a * (0.75 - i * 0.12)})`;
          px(dx, dy, c);
          px(dx - 1, dy + 1, c);
          px(dx + 1, dy + 1, c);
          px(dx, dy + 2, c);
        }
        const sx = 18 + 2 * 4;
        const sy = FLOOR + 18 - Math.round(p * 12) - 4;
        const ink = `rgba(120,96,60,${a * 0.8})`;
        if (bedTaps.current.scene === "mouse") {
          px(sx, sy, ink);
          px(sx + 1, sy, ink);
          px(sx + 2, sy + 1, ink);
          px(sx - 1, sy + 1, ink);
        } else if (bedTaps.current.scene === "fish") {
          px(sx, sy, ink);
          px(sx + 1, sy, ink);
          px(sx + 2, sy - 1, ink);
          px(sx + 2, sy + 1, ink);
        } else if (bedTaps.current.scene === "stars") {
          px(sx, sy - 1, ink);
          px(sx + 2, sy, ink);
          px(sx + 1, sy + 2, ink);
        } else if (bedTaps.current.scene === "moth") {
          px(sx, sy, ink);
          px(sx + 2, sy, ink);
          px(sx + 1, sy + 1, ink);
        } else if (bedTaps.current.scene === "piano") {
          px(sx, sy, ink);
          px(sx + 1, sy, ink);
          px(sx + 2, sy, ink);
          px(sx + 1, sy + 1, ink);
        } else if (bedTaps.current.scene === "box") {
          px(sx, sy, ink);
          px(sx + 1, sy, ink);
          px(sx + 2, sy, ink);
          px(sx, sy + 1, ink);
          px(sx + 2, sy + 1, ink);
        } else if (bedTaps.current.scene === "brush") {
          px(sx, sy, ink);
          px(sx + 1, sy + 1, ink);
          px(sx + 2, sy + 2, ink);
        } else {
          px(sx, sy, ink);
          px(sx + 1, sy, ink);
          px(sx, sy + 1, ink);
          px(sx + 1, sy + 1, ink);
        }
      }

      if (pet || sc.purring || slowBlinking || staySettled) {
        const a = pet ? 0.7 + petDepth.current * 0.3 : slowBlinking ? 0.8 : staySettled ? 0.34 : 0.42;
        const purrX = kx + Math.min(10, Math.max(2, (sp.w >> 1) - 3));
        for (let i = 0; i < 2; i++) {
          const p = (t / 1500 + i * 0.5) % 1;
          const yy = Math.round(y + sp.oy - 2 - p * 7);
          const c = `rgba(255,255,255,${a * (1 - p)})`;
          px(purrX, yy, c);
          px(purrX + 1, yy - 1, c);
          px(purrX + 2, yy, c);
        }
      }

      const chorusRemaining = catTaps.current.chorusUntil - t;
      if (!reduce && chorusRemaining > 0) {
        const p = 1 - chorusRemaining / PURR_CHORUS_MS;
        const a = Math.min(1, chorusRemaining / 450) * (1 - p * 0.25);
        for (let ring = 0; ring < 3; ring++) {
          const radius = 5 + ring * 5 + Math.round((p * 5 + ring) % 3);
          const c = `rgba(240,174,180,${a * (0.62 - ring * 0.14)})`;
          px(kx - radius, ky + 2, c);
          px(kx + radius, ky + 2, c);
          if (ring < 2) px(kx - radius + 2, ky + 4, c);
        }
      }

      if (sc.snug > 0.35) {
        // prettier-ignore
        for (const [dy, w] of [[1, 20], [2, 24], [3, 26], [4, 24], [5, 18]] as const) {
          dither(kx - (w >> 1), ky + dy, w, 1, sc.patch);
        }
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      cancelAnimationFrame(refit);
      removeEventListener("resize", fit);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerleave", onLeave);
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointerup", onUp);
      cv.removeEventListener("pointercancel", onCancel);
      cv.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      role="img"
      tabIndex={0}
      aria-label={`${label} The room has quiet interactive details.`}
      style={{
        display: "block",
        borderRadius: 26,
        border: "1px solid rgba(95,65,43,.12)",
        boxShadow:
          "0 1px 0 rgba(255,255,255,.72) inset, 0 24px 56px -25px rgba(82,53,34,.58), 0 8px 22px -18px rgba(82,53,34,.35)",
        imageRendering: "pixelated",
        userSelect: "none",
        touchAction: role === "him" ? "none" : "manipulation",
        cursor: `url("${PAW_CURSOR}") 11 16, pointer`,
      }}
    />
  );
}
