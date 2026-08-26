import { useEffect, useRef } from "react";
import type { Cat as CatLook, Clock, Gift, Mood } from "./types.js";
import { mixHex, sceneFor } from "./hours.js";
import { fireflyAt, mothAt } from "./critters.js";
import { play, playPianoNote } from "./sound.js";
import { dreamOf, type Dream, type DreamContext, type DreamScene } from "./dreams.js";
import { catCallCode } from "./secrets.js";
import { moonPhase, moonPixelLit } from "./moon.js";
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
  MRRP,
  PLANT,
  POSES,
  SHELF,
  TAIL,
  WINDOW,
  type Pose,
  type Sprite,
} from "./sprites.js";

/**
 * The room, drawn as pixel art at her local time of day.
 *
 * Fixed 100x80 grid, one logical pixel per aligned rectangle. Never resample a small canvas upward:
 * it leaves pixels of two different sizes, which reads as a mistake rather than a style.
 */

const GW = 100,
  GH = 80,
  FLOOR = 48;
/**
 * How much of the room is on screen at once. The room is authored 100 wide and cropped to this,
 * following her and clamped to the walls.
 *
 * Crop, never scale: one logical pixel to one aligned rectangle is the rule the look depends on.
 */
const VW = 80;
/** The window is bolted to the wall here. Only the light it throws moves. */
const WIN_X = 60,
  WIN_CX = WIN_X + 8;
/** Where a box sits when there is one. Right of the beam, clear of the bed. */
const BOX_X = 44,
  BOX_Y = FLOOR + 9;
/** One lap of the room. Long enough to see, short enough that it's over before you react. */
const ZOOM_MS = 1600;
/** How long a bird stays before it gets bored of her. */
const BIRD_MS = 5200;
/** A second look at the daytime window scatters a small prism through the room. */
const SUN_CATCHER_MS = 3200;
/** A shooting star is gone before it can turn into an animation someone waits to see again. */
const STAR_MS = 900;
/** A double-tap at the night window leaves a tiny constellation to find for a moment. */
const CONSTELLATION_MS = 6200;
/** A sent light rises into the glass before it waits on the other person's side. */
const WINDOW_LIGHT_SEND_MS = 1900;
/** A leaf takes just long enough to fall that it reads as a small response, not an idle loop. */
const LEAF_FALL_MS = 1200;
/** Just enough time for a picture-frame glint to read, not enough to turn into decoration. */
const PHOTO_GLINT_MS = 700;
/** A second quick look at the framed photo gets a tiny warm memory burst. */
const PHOTO_MEMORY_MS = 2200;
/** A just-tapped cup sends up a little steam before the room goes quiet again. */
const MUG_STEAM_MS = 2200;
/** A second tap on the warm mug leaves a short, candle-like glow on the shelf. */
const MUG_GLOW_MS = 2600;
/** Gifts get one private little send-off when somebody lingers on them. */
const GIFT_WISH_MS = 2800;
/** A second invitation to the bed gets a tiny sleepy dream. */
const BED_DREAM_MS = 3200;
/** Three quick pats are enough to make the whole little room purr back. */
const PURR_CHORUS_MS = 2600;
/** Holding an empty bit of floor gives her one short thing to chase. */
const LASER_CHASE_MS = 2800;
/** After the pointer lifts, she gets one last pounce instead of stopping mid-chase. */
const LASER_RELEASE_MS = 900;
/** Visiting every permanent room detail unlocks one quiet whole-room celebration. */
const ROOM_TOUR_MS = 4200;
const ROOM_TOUR_KEYS = ["window", "frame", "shelf", "door", "plant", "bed"] as const;
/** The room's keyboard secret only paints the night window, never the whole screen. */
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
/** Calling a cat the traditional way gets a tiny answer from the room. */
const SUMMON_CODE = "pspsps";
const SUMMON_MS = 5200;
/** A cardboard box is never really absent; sometimes it is only waiting to be asked for. */
const BOX_CODE = "box";
const SECRET_BOX_MS = 8200;
/** Some words are toys if you say them in the right room. */
const YARN_CODE = "yarn";
const YARN_MS = 5200;
/** Ask nicely and a tiny fish-shaped treat appears on the floor. */
const TREAT_CODE = "treat";
const TREAT_MS = 5600;
const TREAT_X = 68;
/** Catnip turns a typed word into several extremely undignified laps of the room. */
const CATNIP_CODE = "catnip";
const CATNIP_MS = 6200;
const CATNIP_X = 54;
/** A word becomes a five-note tune and a dance too small for dignity. */
const MUSIC_CODE = "music";
const MUSIC_MS = 5600;
/** A typed mouse gets one cinematic mistake: peeking in while a cat is home. */
const MOUSE_CODE = "mouse";
const MOUSE_MS = 7000;
/** A typed invitation fills the room with five bubbles that can actually be chased and popped. */
const BUBBLE_CODE = "bubbles";
const BUBBLE_REWARD_MS = 2400;
const PIANO_REWARD_MS = 4200;
/** Completing six room discoveries earns a sky that can be called back by name. */
const STARS_CODE = "stars";
const CONSTELLATION_REWARD_MS = 7200;
const STAR_FLIGHT_MS = 1300;
/** Calling her by her actual name gets a response no generic secret word can give. */
const NAME_CALL_MS = 6200;
/** A second quick box tap turns a peek into a tiny peekaboo performance. */
const BOX_PLAY_MS = 2800;
/** How long the cursor has to stay beside her before she answers with a slow blink. */
const SLOW_BLINK_WAIT_MS = 1800;
const SLOW_BLINK_MS = 850;
/** A small secret shower: long enough to notice through the glass, then gone. */
const RAIN_MS = 6800;
/** The brief bright thing that can follow the plant's hidden storm. */
const RAINBOW_MS = 2600;
/** A small bloom hangs around after the rainbow, then leaves the room as it found it. */
const PLANT_BLOOM_MS = 3800;
/** A double knock at the door gets a tiny note slid into the room. */
const DOOR_NOTE_MS = 3600;
/**
 * Where it comes to rest, having rolled. Not under the shelf, where it would land and never be seen:
 * the shelf is at 80 and the camera shows only 80 of 100 columns. Out here it is in frame wherever
 * she is. Mugs roll, so this costs nothing in plausibility.
 */
const MUG_FLOOR_X = 66,
  MUG_FLOOR_Y = FLOOR + 14;

/** Things in a room, not a menu of interactions. Nothing hints which objects hold a secret. */
const PROP_LABELS: Record<string, string> = {
  window: "the window",
  frame: "the picture on the wall",
  shelf: "the shelf",
  door: "the door",
  plant: "the plant",
  bed: "her bed",
  box: "the box",
};

/**
 * The furniture, with its boxes. One table so drawing and hit-testing cannot disagree. Every sprite
 * has a zero offset except BED, whose ox is -11, so its box starts left of its draw x.
 */
const PROPS = [
  { key: "window", sp: WINDOW, x: WIN_X, y: 4 },
  { key: "frame", sp: FRAME, x: 16, y: 12 },
  { key: "shelf", sp: SHELF, x: 80, y: FLOOR - 24 },
  { key: "door", sp: DOOR, x: 6, y: FLOOR - 16 },
  { key: "plant", sp: PLANT, x: 87, y: FLOOR - 13 },
  { key: "bed", sp: BED, x: 24 - 11, y: FLOOR + 22 },
  // Its hit box is enabled only while there is actually a box in the room (see the filter below).
  { key: "box", sp: BOX_BACK, x: BOX_X, y: BOX_Y },
] as const;

/** Fixed colours. Everything else comes from `look`, so she stays recolourable. */
const INK = "#4a3520";
const PINK = "#e79ba3";
const BLUSH = "#f0aeb4";
const WHITE = "#fffdf6";

/*
 * Closed eyes are authored as lines, not recolored open-eye blocks. The sprite role `e` covers two
 * or three pixels so an open eye can carry a highlight; painting all of it brown reads as sunglasses.
 */
const CLOSED_EYES: Record<Pose, { y: number; left: number; right: number; width: number }> = {
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

export function Cat({
  label,
  look,
  clock,
  mood,
  nudge,
  eyesOpen = false,
  framed = false,
  doorOpenAt = null,
  box = false,
  gift = null,
  cake = false,
  windowLight = false,
  onWindowLight,
  shelfDown = false,
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
  /** What the room says in words. The canvas is otherwise silent to a screen reader. */
  label: string;
  look: CatLook;
  clock: Clock;
  /** What you told her. Changes what she does, never what the room's light does. */
  mood: Mood | null;
  /** Bumped whenever an action happens, so she reacts to it. */
  nudge: number;
  /**
   * Hold her eyes open regardless of the hour. Set while the setup panel is open, because shut eyes
   * are drawn as an outline-coloured line, which puts the eye colour nowhere on screen and makes
   * every swatch in the picker look identical.
   */
  eyesOpen?: boolean;
  /** He has taken her photo, so the picture on the wall is her. */
  framed?: boolean;
  /**
   * When somebody walked in, as ms epoch, or null for a shut door.
   *
   * Keep it a timestamp, not a boolean with per-frame progress in a ref: this component remounts
   * often enough to reset that mid-swing and leave the door permanently ajar. Deriving progress
   * from a fixed moment also survives a dropped frame or a backgrounded tab.
   */
  doorOpenAt?: number | null;
  /**
   * There is a box in the room today, so she is probably in it. Whether she is *in* it is decided
   * here rather than on the server: it is a drawing decision, not shared state.
   */
  box?: boolean;
  /** Something she left on the floor. His side only; the room just draws whatever it's handed. */
  gift?: Gift | null;
  /** True on the room's own anniversary, and on its first week and month. Puts a cake on the floor. */
  cake?: boolean;
  /** The other person left a light in the window. It waits until this person touches it. */
  windowLight?: boolean;
  /** Leaves a light when the window is double-tapped, or collects one already waiting. */
  onWindowLight?: () => void;
  /** The mug is on the floor rather than the shelf. Tapping it there puts it back. */
  shelfDown?: boolean;
  /** Called when someone taps the fallen mug. Seat-checked on the server, not here. */
  onTidy?: () => void;
  /**
   * Who is looking, which decides what touching the cat does. Petting is his; she gets a purely local
   * poke; a spectator and the landing page get neither. Furniture is tappable for everyone, since
   * nothing about it touches the server.
   */
  role?: "him" | "her" | null;
  /**
   * You are both in the room at this moment: she gets up, comes to the middle and purrs. Presence
   * outranks her mood and the hour for placement and pose, and touches nothing about the light.
   */
  together?: boolean;
  /** He held on the cat. Fires once per press. */
  onPet?: () => void;
  /** She tapped her own cat. Local only, no request. */
  onPoke?: () => void;
  /** Reported up so the other seat can be told. This stays ignorant of rooms and the network. */
  onFound?: (key: DiscoveryKey) => void;
  /** Exposes a PNG capture of the rendered room without leaking the canvas out of this component. */
  onCapture?: (capture: () => Promise<Blob | null>) => void;
  /** The furniture secrets were reachable only by hit-tested canvas taps, so two of the largest were
   *  impossible to find on a keyboard. */
  onProps?: (props: { key: string; label: string }[], poke: (key: string) => void) => void;
  /** Both of you have called her by name. She answers a little differently once that is true. */
  bothCalledHer?: boolean;
  /** What the room knows, for the dream on the bed. Read at the moment she settles, not on render. */
  dreamContext?: DreamContext;
  /** The dream she just started, so the room can say it out loud. */
  onDream?: (dream: Dream) => void;
  /** Stable room id used only for this device's hidden constellation progress. */
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
  const doorRef = useRef(doorOpenAt);
  doorRef.current = doorOpenAt;
  const boxRef = useRef(box);
  boxRef.current = box;
  const giftRef = useRef(gift);
  giftRef.current = gift;
  const cakeRef = useRef(cake);
  cakeRef.current = cake;
  const windowLightRef = useRef(windowLight);
  windowLightRef.current = windowLight;
  const onWindowLightRef = useRef(onWindowLight);
  onWindowLightRef.current = onWindowLight;
  const downRef = useRef(shelfDown);
  downRef.current = shelfDown;
  const tidyRef = useRef(onTidy);
  tidyRef.current = onTidy;
  /**
   * Zoomies: when the next one is due, and when the current one started. The only thing she does
   * that nothing causes. Everything else here is a response, and a cat that only responds is a puppet.
   */
  const zoom = useRef({ next: 0, start: -1e9 });
  /**
   * A bird on the sill, and how long it stays. Deliberately local, unlike everything else added to
   * this room: a bird is a moment, not a fact, and telling someone one happened four hours ago is
   * a notification, which this app does not have.
   */
  const bird = useRef(-1e9);
  /** A night-only window surprise. Like the bird, it is a moment rather than shared room state. */
  const shootingStar = useRef(-1e9);
  /** Local send/collect flourish; the waiting state itself comes from the room. */
  const windowLightTouchedAt = useRef(-1e9);
  /** Looking twice is a little different from looking once. */
  const windowTaps = useRef({ count: 0, last: -1e9, constellationUntil: -1e9, sunCatcherUntil: -1e9 });
  /** When the box gets a tap, she rises just far enough to be caught looking. */
  const boxPeekUntil = useRef(-1e9);
  const boxTaps = useRef({ count: 0, last: -1e9, playUntil: -1e9 });
  /** A tapped bed is an invitation, not a command; she only stays for a small local while. */
  const bedNestUntil = useRef(-1e9);
  /** The plant is allowed one local little objection when somebody pokes it. */
  const fallingLeaf = useRef(-1e9);
  const plantTaps = useRef({ count: 0, last: -1e9, rainUntil: -1e9, rainbowUntil: -1e9, bloomUntil: -1e9 });
  /** The framed photo is a little proud of itself, but only when it exists. */
  const photoGlint = useRef(-1e9);
  const photoTaps = useRef({ count: 0, last: -1e9, memoryUntil: -1e9 });
  /** The shelf holds a warm mug, which only needs to announce itself when somebody notices it. */
  const mugSteamedAt = useRef(-1e9);
  const mugTaps = useRef({ count: 0, last: -1e9, glowUntil: -1e9 });
  /** A gift only sparkles after someone notices what she carried in. */
  const giftGlint = useRef(-1e9);
  const giftTaps = useRef({ count: 0, last: -1e9, wishUntil: -1e9 });
  const bedTaps = useRef({ count: 0, last: -1e9, dreamUntil: -1e9, scene: "fish" as DreamScene });
  // Refs, because the draw loop and the tap handler both close over this once and must not go stale.
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
  /** A second knock means somebody is playing with the door, so the room plays back. */
  const doorTaps = useRef({ count: 0, last: -1e9, noteUntil: -1e9 });
  /** A tiny keyboard secret. It is local, ephemeral, and only visible through the night window. */
  const auroraUntil = useRef(-1e9);
  /** The room's second typed secret: a few bright things come when somebody calls for her. */
  const summonUntil = useRef(-1e9);
  /** A local cardboard delivery summoned from the keyboard. */
  const secretBoxUntil = useRef(-1e9);
  /** A keyboard-summoned ball that makes two quick trips across the boards. */
  const yarnUntil = useRef(-1e9);
  /** A typed treat gets a short approach, snack, and very small thank-you. */
  const treatUntil = useRef(-1e9);
  /** A local catnip sprint; never shared as room state because it leaves no lasting object. */
  const catnipUntil = useRef(-1e9);
  /** Hold her dance near where she heard the command instead of letting the mood walk her away. */
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
  /** Her name brings her to the middle for one small recognition moment. */
  const nameCallUntil = useRef(-1e9);
  /** A slow blink is one answer per quiet cursor stay, never an idle animation on a timer. */
  const slowBlink = useRef({ until: -1e9, answered: false });
  /** Where the swing had got to when the door was told to shut, so the close eases from there. */
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

  /** True while he is holding on her. Owned here rather than by the caller, see the pointer setup. */
  const petting = useRef(false);
  /** Her box in grid space, refreshed every frame, so a tap can be tested against where she actually is. */
  const catBox = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  /** The live camera pan, recorded per frame so a synthetic tap can be aimed in screen space. */
  const camRef = useRef(0);
  /** The last bit of furniture somebody touched, and when. */
  const poked = useRef<{ key: string; at: number } | null>(null);
  /** Something worth looking at, and until when. */
  const lookAt = useRef<{ x: number; until: number } | null>(null);

  const near = useRef(0);
  const catX = useRef<number | null>(null);
  const bounce = useRef(0);
  const lastNudge = useRef(nudge);

  useEffect(() => {
    if (!onProps) return;
    const cv = ref.current;
    if (!cv) return;

    /*
     * A synthetic pointer event, not a second code path: the furniture handler grows with every
     * secret and a parallel keyboard branch would drift from it immediately. The x needs the live
     * camera pan, since the room is wider than the view.
     */
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
      /*
       * The pointer handler calls cv.focus() so a code can be typed after a tap. On a keyboard that drags
       * focus out of the room list every time, making the six-object room tour a chore.
       */
      const before = document.activeElement as HTMLElement | null;
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

  /** When to stop showing the speech bubble. Same clock as the rAF timestamp, so the loop can read it. */
  const speakUntil = useRef(0);

  useEffect(() => {
    if (nudge !== lastNudge.current) {
      lastNudge.current = nudge;
      bounce.current = 1;
      speakUntil.current = performance.now() + 1700;
    }
  }, [nudge]);

  useEffect(() => {
    const cv = ref.current!;
    const g = cv.getContext("2d")!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lunar = moonPhase(new Date());
    const season = seasonFor(new Date());
    const seasonalPlant = seasonalPlantColors(season);

    /** Size of one logical pixel, in device pixels. Recomputed on resize. */
    let s = 5;
    /** The view's left edge, in grid columns. Recomputed once per frame from where she is. */
    let cam = 0;
    const fit = () => {
      const r = cv.getBoundingClientRect();
      const d = Math.min(2, devicePixelRatio || 1);
      cv.width = Math.max(VW, Math.round(r.width * d));
      cv.height = Math.max(GH, Math.round(r.height * d));
      s = cv.width / VW;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(cv);

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
          // Kept just ahead of pointer events; release extends this into the final pounce below.
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

    /*
     * Taps are hit-tested here, against the same coordinates the draw code uses. Owning the geometry
     * and owning the pointer belong together, or furniture cannot respond to being touched at all.
     */
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
      // Her first, and with a couple of pixels of slack, because a finger is much bigger than a cat
      // drawn 24 pixels wide.
      const b = catBox.current;
      if (b && x >= b.x0 - 2 && x <= b.x1 + 2 && y >= b.y0 - 2 && y <= b.y1 + 3) {
        const now = performance.now();
        if (roleRef.current === "him") {
          petting.current = true;
          onPetRef.current?.();
        } else if (roleRef.current === "her") onPokeRef.current?.();
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
      // The fallen mug first: it sits on the boards under the shelf, so a tap there is much more
      // likely to mean "put that back" than "poke the floor". Generous box, because it is eight
      // pixels wide on a grid that is eighty across.
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
      // Her little gifts sit by the door rather than under the cat. A tap is just an acknowledgement
      // — not a claim or a state change — but the glint makes the object feel chosen instead of like
      // a leftover sprite. It is intentionally local because the gift itself already carries meaning.
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
      // The window has a daytime bird and a night-time shooting star. Neither is shared: they are
      // small things you happen to notice, not events the other person needs to be told about.
      if (hit?.key === "window") {
        const now = performance.now();
        const scene = sceneFor(clockRef.current, Date.now(), moodRef.current, togetherRef.current);
        // A light from the other person outranks the ordinary window secrets. One touch collects it;
        // the server clears the shared bit while this local burst makes the handoff visible now.
        if (windowLightRef.current && roleRef.current) {
          windowLightTouchedAt.current = now;
          windowTaps.current.count = 0;
          onWindowLightRef.current?.();
          play("twinkle");
        }
        if (scene.sun < 0.12) {
          shootingStar.current = now;
          const taps = windowTaps.current;
          taps.count = now - taps.last < 1400 ? taps.count + 1 : 1;
          taps.last = now;
          // The first tap gets a shooting star. The second, quick enough to mean somebody is still
          // looking, joins the little lights in the glass into a constellation. It is a discovery,
          // not a permanent decoration or a thing the other person needs a notification about.
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
        // Three quick taps is deliberately discoverable rather than documented. A normal plant
        // poke is still just a leaf; somebody fiddling with the room gets a weather moment.
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
      // A tap at the door is not shared presence — it is just somebody checking whether she is
      // listening. She is, and answers locally before going back to whatever she was doing.
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
        // And she notices. Looking at the thing you touched is most of what makes the room feel lived
        // in, and it costs one number: the eye highlight already knows how to aim at an x.
        lookAt.current = {
          x: rainStarted ? WIN_CX : hit.x + hit.sp.w / 2,
          until: performance.now() + (rainStarted ? 4200 : 2400),
        };
      }
      // The floor is deliberately the only long-press interaction: everything built into the room
      // already has a tap response. Holding an empty board gives her a tiny dot to chase instead.
      if (!hit && y >= FLOOR) {
        floorPress.current = { x, y, at: performance.now(), active: false };
        // A regular board tap is just a small point of interest; holding it is what escalates into
        // the chase. This makes the floor responsive without making every tap an easter egg.
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
    // A cancelled touch is not a held-floor choice (it can be a browser gesture or a phone taking
    // over the pointer), so it only clears local press state instead of starting a surprise chase.
    const onCancel = () => {
      petting.current = false;
      floorPress.current = null;
    };
    const onKey = (e: KeyboardEvent) => {
      // The room needs focus for its little code. Once it has it, arrow keys should not also scroll
      // the page away from the window while someone is trying the sequence.
      if (ROOM_CODE.includes(e.key)) e.preventDefault();
      const expected = ROOM_CODE[roomCodeAt];
      roomCodeAt = e.key === expected ? roomCodeAt + 1 : e.key === ROOM_CODE[0] ? 1 : 0;
      if (roomCodeAt === ROOM_CODE.length) {
        const now = performance.now();
        const scene = sceneFor(clockRef.current, Date.now(), moodRef.current, togetherRef.current);
        if (scene.sun < 0.12) {
          auroraUntil.current = now + AURORA_MS;
        } else {
          // The original reward only rendered at night, so entering the full code during the day
          // succeeded invisibly. Daylight now answers with its own longer prism and a visiting bird.
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
        // Her real name wins over the shipped words. A cat called Music should still know that she
        // is being called; room tricks are generic, recognition is not.
        if (nameCode && typedRoomCode.endsWith(nameCode)) {
          const now = performance.now();
          nameCallUntil.current = now + NAME_CALL_MS;
          onFoundRef.current?.("herName");
          speakUntil.current = now + 1200;
          bounce.current = 1;
          typedRoomCode = "";
          play("purr");
          /*
           * Once both of them have called her, she sometimes comes. Not every time: a cat that
           * arrives on command is a dog, and turning up has to stay her idea.
           */
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

    // Dust lives in the beam. Integer positions, because half a pixel of dust is a grey smudge.
    // Offsets are relative to the shaft's centre at that height, so dust can never drift outside
    // the light. Loose dust reads as stray pixels, which looks like a rendering fault.
    const motes = Array.from({ length: 12 }, () => ({
      dx: Math.floor(Math.random() * 15) - 7,
      y: Math.random() * FLOOR,
      sp: 0.04 + Math.random() * 0.06,
    }));

    /** One logical pixel. Edges are rounded so neighbours share a boundary exactly. */
    const px = (x: number, y: number, c: string) => {
      if (!c || y < 0 || y >= GH) return;
      // Clipped against the view, not the grid: anything the camera is not looking at is skipped rather
      // than drawn off the edge of the canvas.
      const vx = x - cam;
      if (vx < 0 || vx >= VW) return;
      const X = Math.round(vx * s),
        Y = Math.round(y * s);
      g.fillStyle = c;
      // Both edges must come from the SAME coordinate space. Taking the left edge from the view and the
      // right edge from the grid made every pixel (cam + 1) columns wide, which smeared the whole room
      // sideways the moment the camera moved off zero.
      g.fillRect(X, Y, Math.round((vx + 1) * s) - X, Math.round((y + 1) * s) - Y);
    };

    const rect = (x: number, y: number, w: number, h: number, c: string) => {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, c);
    };

    /** 50% checkerboard: the pixel-art way to get a colour between two colours. */
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
    const frame = (t: number) => {
      /*
       * How far open the door is, 0..3. Computed here rather than at the draw call because the camera
       * needs it too. Open fast, shut slow: the slow close is what gives her time to look at it.
       */
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

      /*
       * The camera leans toward the door while it is open, or the feature is usually invisible: the
       * view is 80 of 100 columns and follows her, so the door at column 6 is rarely in frame.
       * Blended by how far open it is rather than clamped, so the view glides instead of snapping.
       */
      const camBase = Math.max(0, Math.min(GW - VW, Math.round((catX.current ?? GW / 2) - VW / 2)));
      const pull = doorProg / 3;
      cam = Math.round(camBase * (1 - pull) + Math.min(camBase, 2) * pull);
      camRef.current = cam;
      const L = lookRef.current;
      const sc = sceneFor(clockRef.current, Date.now(), moodRef.current, togetherRef.current);
      const beamX = Math.round(sc.beam * GW);

      // ── room ──────────────────────────────────────────────────────────────
      // Flat bands with a dithered seam, not a gradient. Bands are what make a room read as pixel
      // art; a smooth ramp just reads as a photograph with large pixels.
      rect(0, 0, GW, FLOOR - 9, sc.wallTop);
      rect(0, FLOOR - 9, GW, 9, sc.wallBottom);
      rect(0, FLOOR, GW, 10, sc.floorFar);
      rect(0, FLOOR + 10, GW, GH - FLOOR - 10, sc.floorNear);

      /*
       * Quiet surface detail. Fixed marks, never random texture: random pixels reshuffle every frame
       * and make a calm room shimmer.
       */
      const wallShade = mixHex(sc.wallBottom, INK, 0.08);
      const wallLift = mixHex(sc.wallTop, sc.beamWarm, 0.12 + sc.sun * 0.08);
      // prettier-ignore
      for (const [x, y, w] of [[4, 8, 5], [38, 17, 3], [48, 7, 6], [90, 27, 4]] as const) {
        dither(x, y, w, 2, wallShade);
      }
      // prettier-ignore
      for (const [x, y] of [[12, 30], [34, 6], [52, 31], [96, 11]] as const) px(x, y, wallLift);
      /*
       * Skirting: one bright line where the wall meets the floor, to read as depth.
       *
       * Lift it out of the wall's own colour; never a fixed near-white. One grid row is about eleven
       * screen pixels scaled up, so a flat highlight becomes a white band glowing at midnight.
       */
      rect(0, FLOOR - 1, GW, 1, mixHex(sc.wallBottom, sc.beamWarm, 0.3 + sc.sun * 0.35));
      rect(0, FLOOR, GW, 1, mixHex(sc.floorFar, INK, 0.14));
      // Staggered joins and small highlights, not just perspective bands: what the empty half of the
      // room lacks is material, not more furniture.
      for (const by of [FLOOR + 9, FLOOR + 15, FLOOR + 23, FLOOR + 30]) rect(0, by, GW, 1, sc.floorFar);
      const boardJoin = mixHex(sc.floorFar, INK, 0.16);
      const boardGlint = mixHex(sc.floorNear, sc.beamWarm, 0.1 + sc.sun * 0.08);
      // prettier-ignore
      for (const [x, y, h] of [[8, 49, 8], [31, 49, 8], [70, 49, 8], [18, 58, 5], [52, 58, 5], [86, 58, 5], [5, 64, 7], [40, 64, 7], [75, 64, 7], [25, 72, 8], [62, 72, 8]] as const) {
        rect(x, y, 1, h, boardJoin);
        px(x + 1, y + 1, boardGlint);
      }

      /*
       * A low rug gives the cat a place in the composition without turning the room into a set.
       * Pixel-rounded rows keep its silhouette soft; two quiet inner bands imply woven material.
       */
      const rugShadow = mixHex(sc.floorNear, INK, 0.25);
      const rugEdge = mixHex(sc.floorNear, "#765367", 0.58);
      const rugBody = mixHex(sc.floorNear, "#a8737e", 0.48);
      const rugThread = mixHex(rugBody, sc.beamWarm, 0.16);
      rect(35, FLOOR + 12, 40, 1, rugShadow);
      rect(32, FLOOR + 13, 46, 13, rugEdge);
      rect(34, FLOOR + 12, 42, 15, rugEdge);
      rect(35, FLOOR + 13, 40, 13, rugBody);
      dither(38, FLOOR + 16, 34, 1, rugThread);
      dither(38, FLOOR + 22, 34, 1, rugThread, 1);
      for (const x of [35, 40, 69, 74]) px(x, FLOOR + 27, rugEdge);

      // ── light ─────────────────────────────────────────────────────────────
      // A leaning shaft, solid down the middle and dithered at both edges so it fades off without a
      // gradient. Three gotchas, each of which produced vertical streaks down the wall:
      //   - Fill solid from the lit palette; never glaze a translucent layer over dithered bands.
      //   - No `phase` on the edge dither. Passing y makes the parity (x + 2y), which depends on x.
      //   - The shaft pivots from a fixed window. A window that moves collides with the picture.
      const beamCore = sc.lightPhase === "golden" ? 18 : sc.lightPhase === "dawn" ? 10 : 16;
      if (sc.lightPhase !== "night") {
        for (let y = 14; y < FLOOR; y++) {
          const k = (y - 14) / (FLOOR - 14);
          const cx = Math.round(WIN_CX + (beamX - WIN_CX) * k);
          const half = beamCore >> 1;
          rect(cx - half, y, beamCore, 1, sc.litWall);
          dither(cx - half - 3, y, 3, 1, sc.litWall);
          dither(cx + half, y, 3, 1, sc.litWall);
          // Quarter density outside that, so the edge falls off in two steps rather than one.
          for (const ox of [-half - 5, -half - 4, half + 2, half + 3]) {
            if ((ox + y) % 4 === 0) px(cx + ox, y, sc.litWall);
          }
        }
      }
      // The pool of light on the boards, sized as a shape rather than a number: too short and it sits
      // at her head height as two pale wings; too wide and a mood that moves her to the door leaves a
      // bright lens with nothing in it. It has to reach under her at rows 49-66.
      // prettier-ignore
      const POOL = [
        [1, 16], [2, 20], [3, 24], [4, 26], [5, 26], [6, 24], [7, 22], [8, 18], [9, 14],
      ] as const;
      const poolScale = sc.lightPhase === "golden" ? 1.14 : sc.lightPhase === "dawn" ? 0.72 : 1;
      if (sc.lightPhase !== "night") {
        for (const [dy, w] of POOL) {
          const width = Math.round(w * poolScale);
          rect(beamX - (width >> 1), FLOOR + dy, width, 1, sc.patch);
        }
      }
      // The soft edge starts below her ear line. Dither across her ear rows fans a checkerboard
      // either side of her face, and speckle next to the thing you are meant to look at reads as noise.
      if (sc.lightPhase !== "night") {
        const edgeWidth = Math.round(30 * poolScale);
        dither(beamX - (edgeWidth >> 1), FLOOR + 5, edgeWidth, 9, sc.patch);
      } else {
        // A plug-in nightlight lives where the camera already rests when she sleeps. The shelf lamp
        // can be off-screen beside the bed; this smaller pool keeps the default night room cared for.
        const nightGlow = mixHex(sc.wallBottom, "#d79a62", 0.3);
        // prettier-ignore
        for (const [dx, dy] of [[-6, -3], [-3, -6], [0, -7], [3, -6], [6, -3], [-4, -1], [4, -1]] as const) {
          px(40 + dx, FLOOR - 3 + dy, nightGlow);
        }
        rect(36, FLOOR - 6, 9, 1, mixHex(sc.wallBottom, "#d79a62", 0.16));
        rect(39, FLOOR - 4, 3, 3, INK);
        px(40, FLOOR - 3, "#ffd598");
      }

      /** A y inside the window's glass, given a row offset from its top edge. */
      const wy = (row: number) => 4 + 1 + row;

      // A poked thing wobbles for half a second and settles. One decaying sine, shared by everything,
      // because six bespoke animations would be six things to get subtly wrong and this reads as
      // "it noticed you" either way.
      const pk = poked.current;
      const shake = (key: string): number => {
        if (!pk || pk.key !== key) return 0;
        const age = t - pk.at;
        if (age < 0 || age > 620) return 0;
        return Math.round(Math.sin(age / 30) * (1 - age / 620) * 2);
      };
      const floorTap = pk?.key === "floor" && t - pk.at < 420;

      // Props AFTER the light. Drawn before it, the beam's dither punched holes through them.
      /*
       * The window at night. Don't paint the glass wall colour when the sun is down: it stops being a
       * window and becomes a rectangle on a wall, in the state this app is in most of the time it is
       * ever opened.
       */
      const night = sc.lightPhase === "night";
      const wx = WIN_X + shake("window");
      const rainRemaining = plantTaps.current.rainUntil - t;
      const raining = rainRemaining > 0;

      // Curtain panels sit in front of the beam, so the light feels as though it came through an
      // actual room rather than being painted directly onto the wall. Two folds are enough at this
      // scale; more turns fabric into striping.
      const curtainDark = mixHex(sc.wallBottom, "#66516f", 0.5);
      const curtainLight = mixHex(curtainDark, sc.beamWarm, 0.12 + sc.sun * 0.16);
      rect(wx - 3, 3, 2, 21, curtainDark);
      rect(wx - 1, 3, 1, 20, curtainLight);
      rect(wx + WINDOW.w, 3, 2, 21, curtainDark);
      rect(wx + WINDOW.w + 2, 3, 1, 20, curtainLight);
      const curtainHem = reduce ? 0 : Math.round(Math.sin(t / 2400));
      px(wx - 2 + curtainHem, 24, curtainLight);
      px(wx + WINDOW.w + 1 - curtainHem, 24, curtainLight);
      const glass = raining
        ? mixHex(sc.wallTop, "#718aa1", 0.58)
        : sc.lightPhase === "night"
          ? "#2b3450"
          : sc.lightPhase === "dawn"
            ? "#c79aaa"
            : sc.lightPhase === "golden"
              ? "#d99672"
              : sc.lightPhase === "evening"
                ? "#685b7d"
                : mixHex("#b7d8dc", sc.beamWarm, 0.2);
      blit(WINDOW, wx, 4, { w: INK, h: glass });

      // The window tells the time before the caption does. Each chapter gets one unmistakable
      // landmark, kept inside the glass so the rest of the room stays quiet.
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

      // Distant rooftops live only in the bottom of each pane. They give the window a world without
      // competing with the moon, stars, bird, or anything the two people can leave for each other.
      const skyline = night ? "#252a42" : mixHex(sc.wallBottom, "#6d5f72", 0.48);
      rect(wx + 1, wy(8), 7, 1, skyline);
      rect(wx + 2, wy(7), 2, 1, skyline);
      rect(wx + 9, wy(8), 7, 1, skyline);
      rect(wx + 12, wy(6), 3, 2, skyline);
      if (night) {
        // Three lived-in windows are enough to turn a silhouette into a neighborhood.
        px(wx + 3, wy(7), "#e8bd72");
        px(wx + 11, wy(7), "#d99d62");
        px(wx + 14, wy(6), "#e8bd72");
      }
      // A proper sill, with one shadow row, grounds the window and makes the sunbeam's source read.
      rect(wx - 1, 15, WINDOW.w + 2, 1, mixHex(sc.wallBottom, INK, 0.24));
      rect(wx - 2, 16, WINDOW.w + 4, 1, mixHex(sc.wallBottom, "#a77a58", 0.42));
      if (raining) {
        rect(wx, 15, WINDOW.w, 1, mixHex(glass, "#dce7e6", 0.5));
        px(wx + 3, 17, mixHex(sc.wallBottom, glass, 0.5));
        px(wx + 12, 17, mixHex(sc.wallBottom, glass, 0.5));
      }
      // The view changes quietly with the calendar: petals, thick summer green, falling color, or
      // a little snow caught on the sill. Static in the glass so seasonal atmosphere never becomes
      // another idle animation competing with her.
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
      // A bird on the sill, hopping. Two positions on a slow alternation rather than a smooth
      // slide, because a bird does not slide.
      const birding = t - bird.current < BIRD_MS;
      const starAge = t - shootingStar.current;
      const stargazing = !reduce && night && starAge >= 0 && starAge < STAR_MS;
      const constellating = night && t < windowTaps.current.constellationUntil;
      const sunCatching = !reduce && !night && t < windowTaps.current.sunCatcherUntil;
      const aurora = !reduce && night && t < auroraUntil.current;
      if (birding) {
        const hop = Math.floor(t / 380) % 2;
        blit(BIRD, wx + 4 + hop * 3, 16, { w: INK, b: "#8a6a48", o: "#e0a03f" });
      }
      if (night) {
        // The moon is today's actual eighth of the lunar cycle. Five columns are enough to read
        // waxing from waning while keeping it a room detail rather than turning the window into UI.
        // prettier-ignore
        const moonRows = [[1, 3], [0, 4], [0, 4], [0, 4], [1, 3]] as const;
        for (let my = 0; my < moonRows.length; my++) {
          const [start, end] = moonRows[my]!;
          for (let mx = start; mx <= end; mx++) {
            if (moonPixelLit(lunar.index, mx)) px(wx + 2 + mx, wy(my + 1), "#f4e6b8");
          }
        }
        // Stars, on their own slow twinkles so they never blink together.
        // prettier-ignore
        for (const [sx, sy, ph] of [[12, 2, 0], [14, 6, 0.45], [10, 7, 0.8], [7, 8, 0.25]] as const) {
          if (reduce || Math.sin(t / 900 + ph * 7) > -0.35) px(wx + sx, wy(sy), "#fff6dc");
        }
        // Tap the window at night and, if you are lucky enough to be looking, a star crosses the
        // glass. It stays inside the pane rather than streaking across the room: this is a tiny
        // discovery, not a new feature asking to be noticed.
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
        // A double-tap reveals a tiny drawn constellation, held just long enough to enjoy before
        // it dissolves back into the ordinary night. The lines are intentionally sparse: at this
        // scale an actual star map would be visual noise, while four joined points read as a secret.
        if (constellating) {
          const fade = Math.min(1, (windowTaps.current.constellationUntil - t) / 800);
          const c = `rgba(255,239,180,${fade})`;
          // On the full moon the same secret draws two ears and a tiny cat face. It is available
          // for only one eighth of the month and never announced; the ordinary constellation stays.
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
        // The code's reward is a soft aurora caught in the glass, rather than a loud full-screen
        // effect. Two dithered ribbons move at different speeds so it feels like light outside,
        // not coloured lines drawn on top of the room.
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
      // Unlike shooting stars and prisms, this one came from the other seat and stays in the pane
      // until found. Five pixel-art points are enough to read as a deliberately brighter star in
      // both daylight and night without adding a badge, label, or notification to the room.
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

      // Each permanent room detail found on this device leaves a quiet point in the glass. This is
      // progress without a badge or menu: the room remembers because the room itself looks changed.
      // prettier-ignore
      const keptStars = [[3, 7], [6, 3], [9, 7], [12, 3], [14, 7], [8, 5]] as const;
      for (let index = 0; index < constellation.current.found.size; index++) {
        const [sx, sy] = keptStars[index]!;
        const glow = 0.58 + Math.sin(t / 720 + index * 1.7) * 0.18;
        px(wx + sx, wy(sy), `rgba(255,232,166,${glow})`);
      }

      // A first touch sends its star into the room's sky. Reduced motion gets the destination point
      // immediately, preserving the discovery without making the user watch it travel.
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

      // The sixth point joins into a cat above the room. Once earned, typing "stars" calls it back.
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
      // A pair of quick daytime taps gets more than the bird: it catches a little coloured light
      // on the wall and boards. It lives in the sunbeam rather than becoming a screen-wide rainbow,
      // so it still feels like something the window made, not a reward layer on top of the room.
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
      // A tiny shower is the plant's hidden third-tap response. The drops stay inside the window:
      // weather belongs outside, and a full-room overlay would turn a private discovery into UI.
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
        // A rare two-frame flash turns the secret shower into weather without lighting the whole
        // room like an effect layer. It stays outside, behind the glass.
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
      // A storm from the plant's third tap ends with a small rainbow held behind the same pane.
      // It uses a U-shaped band rather than a smooth curve: one pixel per hue keeps it part of
      // this room's visual language, and the short fade means the reward feels caught, not parked.
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
      // At night one practical light keeps this from becoming the daytime room with its saturation
      // turned down. The halo is dithered into the wall; the lamp itself stays smaller than the mug.
      if (night) {
        const lampGlow = mixHex(sc.wallBottom, "#d89b65", 0.28);
        dither(79, FLOOR - 32, 20, 12, lampGlow);
      }
      // Small shelf shadow and two uneven books add depth without making the prop harder to hit.
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
      // The mug: on the shelf, or on its side on the boards under it. Same object either way, so
      // it has to be recognisably the same drawing.
      if (downRef.current) {
        blit(MUG_DOWN, MUG_FLOOR_X, MUG_FLOOR_Y, { w: INK, c: "#cfe0e4", d: "#a9c2c8" });
      } else {
        blit(MUG, 84 + shake("shelf"), FLOOR - 29, { w: INK, c: "#cfe0e4", d: "#a9c2c8" });
        // A shelf tap makes it clear the cup is still warm. The steam is a short local response,
        // not a permanent animated accessory competing with the cat for attention.
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
        // A second cup tap reads as someone staying with the moment. The warm glow hugs the shelf
        // instead of tinting the room, so it feels like a small lamp found in an ordinary object.
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
          // Near-white, not merely warm. The first attempt used #ffdca6, which sits within a few
          // percent of the daytime wall (#e6cfb2), so the opening blended into the plaster and the
          // door read as still shut. An opening has to be the brightest thing on the wall or it is
          // not an opening.
          o: "#fff8e8",
        });
        // Light spilling across the boards, widening as it goes, keyed to how far open the door is.
        // Dither rather than a solid wedge for the same reason the sun pool is dithered: a hard
        // bright shape on floorboards reads as a rendering fault, not as light.
        const ajar = prog / 3;
        if (ajar > 0.05) {
          const cxd = dx + 6;
          // Solid core, dithered edge, same shape as the sun pool. All-dither read as dirt on the
          // boards rather than as light; light needs a bright middle to be light.
          for (let i = 0; i < 8; i++) {
            const w = Math.round((5 + i * 1.6) * ajar);
            if (w > 0) rect(cxd - (w >> 1), FLOOR + 1 + i, w, 1, "#fff1cf");
          }
          dither(cxd - 12, FLOOR + 4, 24, 7, "#fff1cf");
        }
      }
      // Two quick door taps slip a tiny note under it. The note never becomes state or copy; it is
      // just a pixel-paper surprise that crosses the threshold and is gone before it asks to mean
      // anything. Start partly under the door, then let it glide to a visible board.
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
      // The frame casts one blocky shadow, which is enough to lift it from the wall.
      rect(18, 14, FRAME.w, FRAME.h, mixHex(sc.wallBottom, INK, 0.12));
      if (framedRef.current) {
        blit(FRAME_CAT, 16 + shake("frame"), 12, {
          w: INK,
          f: "#c69a63",
          h: "#cfe0e4",
          c: L.fur,
          e: INK,
          n: PINK,
        });
      } else {
        blit(FRAME, 16 + shake("frame"), 12, { w: INK, f: "#c69a63", h: "#cfe0e4", g: "#e2926f" });
      }
      // Once her photo exists, the frame catches a little light when you tap it. There is no
      // equivalent before the photo because a glint should reward something that actually happened
      // in the room, not advertise a future interaction.
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
      // The second quick tap keeps the frame's reward specific to a real shared action: a small
      // cluster of warm pixels rises off the photo, then vanishes. It is memory-shaped, not an
      // always-on heart effect, so the room stays calm until somebody revisits the portrait.
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
      // A hanging cutting balances the high left side of the room from the art study. It is scenery,
      // not another secret: the permanent interactive plant remains on the floor at the right.
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
      if (season === "spring") {
        px(91, FLOOR - 19, seasonalPlant.detail);
        px(95, FLOOR - 17, seasonalPlant.detail);
      } else if (season === "winter") {
        px(90, FLOOR - 18, seasonalPlant.detail);
        px(94, FLOOR - 19, seasonalPlant.detail);
      }
      // The weather sequence ends where it began: one fresh little flower on the plant. It fades
      // away after a few seconds so the room never accumulates a permanent checklist of secrets.
      if (plantBlooming) {
        const a = Math.min(1, (plantTaps.current.bloomUntil - t) / 700);
        const c = `rgba(236,151,169,${a})`;
        px(93, FLOOR - 16, c);
        px(92, FLOOR - 15, c);
        px(94, FLOOR - 15, c);
        px(93, FLOOR - 14, "#e7c75f");
      }
      // A plant tap drops one leaf. It is intentionally a little easier to miss than the plant
      // itself: the pleasure is in catching it, not in being prompted to make it happen.
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
      // Dusty rose, not the lavender it started as. Lavender was the only cool colour in a room of
      // creams and browns, and at this size it stopped reading as a cat bed and started reading as
      // a stray UI element that had landed on the floor.
      rect(13, FLOOR + 23, 22, 2, mixHex(sc.floorNear, INK, 0.18));
      blit(BED, 24 + shake("bed"), FLOOR + 22, { d: "#b07f76", f: "#d8a79c", b: "#c4918a" });

      /*
       * A cake, on the days the room has a birthday. Sat on the floor rather than announced, like
       * everything else here. Down in the front strip because the middle band is where she sits, and
       * a cake behind the cat is a cake nobody sees.
       */
      if (cakeRef.current) {
        const flame = reduce || Math.sin(t / 260) > -0.4 ? "#ffca6b" : "#ffe6a8";
        blit(CAKE, 42, FLOOR + 20, { d: "#e8d3b0", g: "#f0a6b4", r: flame });
      }
      // What she left, near the door rather than mid-floor: mid-floor is where she loafs, so anything
      // drawn there is covered by the cat.
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
        // Two quick taps let the gift make a tiny wish: a few warmer specks find their way up,
        // then the gift goes back to being a quiet thing left by the door.
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
      // The box, back half. Sits right of centre so it does not fight the bed or the sunbeam, and
      // low enough on the boards to read as standing on them rather than floating.
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

      // Touching every permanent detail is a hidden little room tour. Its reward borrows the room's
      // own warm colors and leaves no badge or progress UI behind; the discovery is the keepsake.
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

      // ── her ───────────────────────────────────────────────────────────────
      // Zoomies. Rare and unannounced: first one in the first couple of minutes, then every two to
      // four. Only a mood that has her leaving and reduced motion stop it.
      //
      // Deliberately NOT gated on her being awake. The scene calls her drowsy most of the day, so
      // that gate means she almost never zooms, and a cat detonating out of a dead sleep is the
      // entire phenomenon.
      if (zoom.current.next === 0) zoom.current.next = t + 45_000 + Math.random() * 75_000;
      const zooming = t - zoom.current.start < ZOOM_MS;
      if (!zooming && t > zoom.current.next && !sc.atDoor && !reduce) {
        zoom.current.start = t;
        zoom.current.next = t + 120_000 + Math.random() * 120_000;
      }

      // A box in the room outranks wherever the mood was going to put her, because that is what a
      // box does to a cat. A mood that sends her to the door still wins: leaving is leaving.
      // A zoom outranks both, briefly, then hands her back to whatever she was doing.
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
      // Two passes with a turnaround in the middle. The eased ends make the ball feel pushed rather
      // than motorized, while the little vertical hop below keeps it from sliding like a UI dot.
      const yarnLap = (yarnProgress * 2) % 2;
      const yarnAcross = yarnLap <= 1 ? yarnLap : 2 - yarnLap;
      const yarnX = 13 + yarnAcross * (GW - 26);
      const wantX = nameCalled
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
                            : sc.catX * GW;
      if (catX.current === null) catX.current = wantX;
      // 0.012 took about 190 frames to cover a move, so more than three seconds of a cat inching across
      // the boards after a mood tap. It read as lag rather than as walking. 0.05 lands in well under a
      // second and still moves like a cat crossing a room rather than teleporting.
      catX.current += (wantX - catX.current) * (catnipping || zooming || mouseChasing ? 0.4 : 0.05);
      const kx = Math.round(catX.current);
      /*
       * In the bed she sits lower. The floor has perspective, so things drawn further down are nearer:
       * her feet land at FLOOR+19 and the cushion is at FLOOR+24. Move her forward as well as across
       * or she hovers above the bed. She only sinks once she has actually reached it.
       */
      const settledInBed = sc.inBed || (nesting && Math.abs(kx - 24) < 8);
      const ky = FLOOR + 19 + (settledInBed ? 6 : 0);

      const want = ptr.in ? Math.max(0, 1 - Math.hypot(ptr.x - kx, ptr.y - (ky - 8)) / 44) : 0;
      near.current += (want - near.current) * 0.07;
      const n = near.current;
      const pet = petting.current;
      bounce.current = Math.max(0, bounce.current - 0.02);

      // Stay quietly beside her and she returns the cat version of a smile. The cursor has to be
      // both close and still; merely passing over the canvas never triggers it, and moving away
      // resets the one-answer-per-stay latch.
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
      const slowBlinking = t < slowBlink.current.until;

      // Her eyes open on her own account (what you told her) or because you came close.
      // Two blinks in a 5.2s cycle, offset so they aren't evenly spaced. Regular blinking reads as
      // a machine; slightly irregular reads as alive.
      const cyc = t % 5200;
      const blink = !reduce && ((cyc > 3400 && cyc < 3520) || (cyc > 4100 && cyc < 4200));
      // While the picker is open she stays awake and does not blink, so the colour you are choosing is
      // continuously visible rather than appearing for 120ms between blinks, or never.
      const la = lookAt.current;
      const looking = !!la && t < la.until;
      // Touching the furniture wakes her just long enough to look at it. A cat that sleeps through you
      // knocking its shelf is furniture itself.
      // A door opening holds her eyes open too. Without this she stays loafed through the whole
      // swing at any drowsy hour, because the perk pose needs open eyes and the scene had already
      // decided she was sleepy. A cat sleeps through a lot, but not a door.
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
      const posed = open > 0.4; // ignores the blink: her pose must not flicker with her eyelids
      // A door opening beats whatever she was doing. Perk is the ears-up, head-turned pose, and it
      // outranks the mood pose deliberately: a cat that stays loafed while a door swings open is a
      // cat that did not notice, which is the one thing this feature is for.
      const noticing =
        (mouseVisiting ||
          doorRef.current !== null ||
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
      const pouncing = mouseChasing || laserPlaying;
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
      // The box front still covers the rest of her, so this reads as a shy answer from inside it
      // rather than a generic jump animation pasted over the furniture.
      const peekLift = boxPlaying
        ? 4 + Math.round(Math.abs(Math.sin(t / 210)) * 3)
        : peeking
          ? Math.round(Math.sin(((boxPeekUntil.current - t) / 1200) * Math.PI) * 5)
          : 0;
      const y = ky + breathe - hop - peekLift;
      catBox.current = { x0: kx + sp.ox, y0: y + sp.oy, x1: kx + sp.ox + sp.w, y1: y + sp.oy + sp.h };

      const pal: Record<string, string> = {
        w: INK,
        f: L.fur,
        d: L.furDk,
        b: L.belly,
        p: PINK,
        n: PINK,
        m: INK,
        c: awake ? BLUSH : "",
        h: awake ? WHITE : "",
        // Shut eyes are drawn as authored lines below; leaving the open-eye cells transparent avoids
        // turning their full highlight-sized area into two dark blocks.
        e: awake ? L.eyes : "",
      };

      /*
       * A mood changes one small thing around her, never the whole palette. The pose carries most of
       * the response; these floor-level details separate two moods that share a silhouette. Keep them
       * in room colours so they read as belongings rather than status effects.
       */
      const activeMood = moodRef.current;
      const moodLeft = kx - 13;
      const moodRight = kx + 11;
      if (activeMood === "sad") {
        // A second cushion turns "sitting with you" into a place kept beside her.
        rect(moodRight, FLOOR + 17, 8, 1, mixHex(sc.floorNear, INK, 0.2));
        rect(moodRight - 1, FLOOR + 14, 10, 3, "#c99291");
        rect(moodRight + 1, FLOOR + 13, 6, 1, "#ddb0a8");
        px(moodRight + 1, FLOOR + 15, "#b77b7d");
        px(moodRight + 6, FLOOR + 15, "#b77b7d");
      } else if (activeMood === "stressed") {
        // A little quilt edge under the loaf: weight and warmth, without darkening the room.
        rect(moodLeft, FLOOR + 17, 28, 3, "#b68486");
        dither(moodLeft + 2, FLOOR + 18, 24, 1, "#d5aaa0");
        for (const x of [moodLeft + 2, moodLeft + 7, moodLeft + 20, moodLeft + 25]) {
          px(x, FLOOR + 20, "#9d7077");
        }
      } else if (activeMood === "tired") {
        // She brought the pillow; doing nothing was clearly the plan.
        rect(moodRight, FLOOR + 16, 9, 2, "#d3aaa0");
        rect(moodRight + 1, FLOOR + 14, 7, 4, "#e2c0b4");
        px(moodRight + 1, FLOOR + 15, "#bc8d8b");
        px(moodRight + 7, FLOOR + 16, "#bc8d8b");
      } else if (activeMood === "bored") {
        // The one thing from the shelf, safely unbroken and waiting beside the culprit.
        rect(moodLeft + 2, FLOOR + 16, 6, 2, "#c8a77d");
        rect(moodLeft + 1, FLOOR + 15, 2, 2, "#c8a77d");
        px(moodLeft + 3, FLOOR + 15, "#ead5b1");
        px(moodLeft + 8, FLOOR + 18, "#8fa172");
        px(moodLeft + 9, FLOOR + 18, "#8fa172");
      } else if (activeMood === "lonely") {
        // Two shoes by the door: somebody can always come sit down again.
        rect(7, FLOOR + 16, 5, 2, "#84646b");
        px(8, FLOOR + 15, "#a47b7b");
        rect(12, FLOOR + 17, 5, 2, "#6f5964");
        px(13, FLOOR + 16, "#94737a");
      } else if (activeMood === "feral") {
        // The shelf's escaped sprig trembles only when motion is welcome.
        const leafHop = reduce ? 0 : Math.round(Math.abs(Math.sin(t / 150)) * 2);
        px(moodRight + 2, FLOOR + 17 - leafHop, "#6f925b");
        px(moodRight + 3, FLOOR + 16 - leafHop, "#8cab69");
        px(moodRight + 4, FLOOR + 17 - leafHop, "#5f824e");
        px(moodRight + 1, FLOOR + 18 - leafHop, "#8f7657");
      } else if (activeMood === "horny") {
        // Her answer is the door; one politely abandoned toy underscores the exit.
        rect(19, FLOOR + 17, 4, 3, "#b86f84");
        px(18, FLOOR + 16, "#d995a5");
        px(23, FLOOR + 20, "#8f596d");
        px(24, FLOOR + 20, "#8f596d");
      }

      // The keyboard treat sits on the boards until she reaches it, then leaves a few crumbs. It is
      // drawn before her so her paws can cover it instead of the snack floating over the sprite.
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
        // The first beat identifies what caused the chaos. After that the loose leaves travel with
        // her, so the packet does not sit behind while the camera follows three laps away.
        const cy = FLOOR + 18;
        rect(CATNIP_X - 3, cy - 1, 7, 3, "#dbc499");
        px(CATNIP_X - 2, cy - 2, "#6c9b57");
        px(CATNIP_X, cy - 3, "#83ad64");
        px(CATNIP_X + 2, cy - 2, "#5e8d4e");
      }

      if (pianoPlaying) {
        // Five warm floor keys, with the next left-to-right note carrying one small paw hint. The
        // hint makes the melody discoverable without writing instructions into the room.
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
        // Tail trails toward the door while the body stays only four pixels long. Small enough to
        // be a discovery, distinct enough not to look like dust on the floorboards.
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

      // ── mood materials ───────────────────────────────────────────────────
      // The copy can say nine different things; the room should not answer all nine with the same
      // pose plus a faster tail. These stay at floor level and use ordinary room objects, so they
      // read as care and mischief rather than status effects.
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
        // The tipped shelf mug already tells half the bored story. A tiny yarn ball and its loose
        // thread make it clear she is waiting for somebody to participate in the other half.
        const ballX = kx - 14;
        rect(ballX - 2, ky - 2, 5, 4, INK);
        rect(ballX - 1, ky - 3, 3, 6, "#9a718b");
        px(ballX, ky - 2, "#d1a7bc");
        // prettier-ignore
        for (const [dx, dy] of [[3, 1], [5, 2], [7, 2], [8, 1], [10, 1]] as const) px(ballX + dx, ky + dy, INK);
      }

      // A three-step contact shadow from the v2 composition. The darkest row stays tight to her paws;
      // the softer rows spread sideways, so she feels planted without gaining a smooth blurry halo.
      const shadowX = kx - (sp.w >> 1);
      rect(shadowX + 1, ky + 1, sp.w - 2, 1, "rgba(74,53,32,.12)");
      rect(shadowX + 3, ky + 2, sp.w - 6, 1, "rgba(74,53,32,.22)");
      rect(shadowX + 6, ky + 3, sp.w - 12, 1, "rgba(74,53,32,.14)");

      const wag = reduce ? 0 : Math.round(Math.sin(t / (620 - sc.play * 380)) * (1 + sc.play * 2 + n));
      // Tucked against her flank. A one-pixel gap here reads as a detached tail, which is worse
      // than no tail at all.
      const tailX =
        pose === "loaf" ? kx + 8 : pose === "stretch" ? kx + 14 : pose === "pounce" ? kx + 9 : kx + 5;
      const tailY = pose === "loaf" ? y - 4 : pose === "perk" ? y - 9 : y - 6;
      if (pose !== "peek") blit(TAIL, pose === "stand" ? kx - 12 : tailX, tailY + wag, pal, pose === "stand");
      blit(sp, kx, y, pal);
      if (!awake) {
        const eye = CLOSED_EYES[pose];
        const faceX = kx + sp.ox;
        const eyeY = y + sp.oy + eye.y;
        rect(faceX + eye.left, eyeY, eye.width, 1, INK);
        rect(faceX + eye.right, eyeY, eye.width, 1, INK);
      }

      // Two blankets, two different answers. Tired gets the folded throw beside her above; "done"
      // gets tucked in, while stressed gets the visual weight of a small patchwork quilt. Neither
      // covers her face or eyes, which remain the emotional center of the sprite.
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
        // Harmless chaos. Reduced motion keeps the scraps where they land rather than deleting the
        // joke, preserving an equivalent scene without animation.
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

      // The bubbles are drawn in front of her because they are targets, not ambient particles.
      // Each has a bright edge, a glassy blue shadow, and one moving highlight; five taps completes
      // the scene and turns the last pop into a brief ring of hearts around the cat.
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

      // Her own name is the most personal secret in the room. She comes to the middle, looks up,
      // and leaves a tiny collar-shaped ring of warmth around herself. Reduced motion keeps the
      // recognition and swaps the rising trail for one still heart.
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
      // The box, near wall. Drawn after her, which is the whole reason the box is two sprites: this
      // is the line between a cat in a box and a cat standing behind one.
      if (boxHere) {
        blit(BOX_FRONT, BOX_X + shake("box"), BOX_Y + 3, { w: INK, k: "#d8ab72" });
        if (boxPlaying) {
          // Two paws hook over the rim while a few packing-paper flecks escape. The box front is
          // already drawn over her body, so these four fur pixels are enough to read as peekaboo.
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

      // The held-floor reward is only a blink of light on the boards. A literal beam would cut
      // through the room; the chase tells the rest of the story.
      if (laserPlaying && Math.floor(t / 110) % 2 === 0) {
        const age = 1 - (laser.current.until - t) / LASER_CHASE_MS;
        const lx = Math.round(laser.current.x + Math.sin(t / 130) * 1);
        const ly = Math.round(laser.current.y + Math.sin(t / 180) * 1);
        px(lx, ly, "#ff6b6b");
        px(lx + 1, ly, "rgba(255,161,161,.7)");
        if (age < 0.78) px(lx - 1, ly + 1, "rgba(255,116,116,.35)");
      }
      // A dragged light leaves only a few dying pixels behind it. The trail makes direction readable
      // without turning the room into a drawing canvas, and clears itself as soon as the chase ends.
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
        // A loose strand trails opposite the direction of travel and curls once on the floor.
        const direction = yarnLap < 1 ? -1 : 1;
        px(Math.round(yarnX) + direction * 3, yarnY + 1, "#b86c84");
        px(Math.round(yarnX) + direction * 4, yarnY + 2, "#b86c84");
        px(Math.round(yarnX) + direction * 5, yarnY + 2, "#d78aa0");
      }
      if (treating && treatProgress > 0.7 && !reduce) {
        // A single tiny heart is enough acknowledgement; a particle fountain would make feeding
        // her feel like collecting a reward instead of finding a secret.
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
        // Three leaves tumble on different phases rather than forming a particle cloud. At this
        // scale, restraint is what makes them read as leaves instead of green rendering noise.
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
        // The reduced-motion version keeps two notes still beside her; otherwise four notes rise
        // on offset loops, with stems so they read as music instead of another sparkle effect.
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

      // The moth, drawn before her so she can be in front of it, and so its position is known when
      // her eyes are drawn.
      const m = reduce ? null : mothAt(t, beamX);
      if (m && sc.sun > 0.15) {
        const mx = Math.round(m.x),
          my = Math.round(m.y);
        // One-pixel wings that alternate, which at this scale is all a flap needs to be.
        const flap = Math.sin(t / 90) > 0 ? 1 : 0;
        const a2 = 0.35 + m.presence * 0.65;
        px(mx, my, `rgba(246,234,208,${a2})`);
        px(mx - 1, my - flap, `rgba(232,214,180,${a2})`);
        px(mx + 1, my - flap, `rgba(232,214,180,${a2})`);
      }

      /*
       * One white pixel per eye, and WHICH pixel is the whole trick: a single pixel is the difference
       * between a cat staring through you and a cat looking at something. She prefers the moth, falls
       * back to your cursor, and otherwise looks straight ahead.
       */
      if (awake) {
        const ey = y + sp.oy + 6;
        // Centres measured off the sprite grids, not guessed. My first pass used one offset for four
        // poses, which put the highlight on an eye's outer edge — and then shifting it a pixel to
        // "look" landed pure white on the blush.
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
        };
        const e = EYES[pose];
        // What you just touched wins, then the moth, then your cursor.
        const at = mouseVisiting
          ? mouseMoment!.x
          : looking
            ? la!.x
            : m && sc.sun > 0.15
              ? m.x
              : ptr.in
                ? ptr.x
                : null;
        // Only 3px-wide eyes have room to shift; a 2px eye would spill onto the fur.
        const look = !e.wide || at === null ? 0 : Math.sign(at - kx) * (Math.abs(at - kx) > 4 ? 1 : 0);
        px(kx + e.l + look, ey, WHITE);
        px(kx + e.r + look, ey, WHITE);
      }

      // The thing she knocked off, on the floor below the shelf it fell from. Outlined, or it
      // disappears into the lit floorboards.
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

      // Type "pspsps" while the room has focus and a small flock answers. They orbit her rather
      // than filling the scene, so the joke reads as the world's gentlest cat-summoning ritual.
      // A fixed phase per light keeps the motion legible as a flock instead of random glitter.
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

      // A firefly, but only after dark, so the room is never completely still. Same tested cadence as
      // the moth on a different phase, which means it is never on screen at the same time as one and
      // needs no timing of its own. It drifts around the middle of the room rather than the sunbeam,
      // because at night there is no beam to stay inside of.
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

      // ── mrrp ──────────────────────────────────────────────────────────────
      // She says the thing the app is named after whenever anything happens to her. Drawn after her
      // so the bubble sits in front, and clamped inside the frame so a cat at either wall still gets
      // a whole bubble. The bird chatter wins the bubble: she is not talking to you right now.
      if ((birding || t < speakUntil.current) && !reduce) {
        const BW = 21,
          BH = 8;
        const bx = Math.max(1, Math.min(GW - BW - 1, kx + 4));
        const by = y + sp.oy - 12;
        rect(bx + 1, by, BW - 2, BH, WHITE); // body, corners left off so it reads as rounded
        rect(bx, by + 1, BW, BH - 2, WHITE);
        rect(bx + 1, by, BW - 2, 1, INK);
        rect(bx + 1, by + BH - 1, BW - 2, 1, INK);
        rect(bx, by + 1, 1, BH - 2, INK);
        rect(bx + BW - 1, by + 1, 1, BH - 2, INK);
        // A two-pixel tail dropping toward her head.
        px(bx + 4, by + BH, WHITE);
        px(bx + 3, by + BH, INK);
        px(bx + 5, by + BH, INK);
        px(bx + 4, by + BH + 1, INK);
        blit(birding ? EK : MRRP, bx + 2, by + 2, { w: INK });
      }

      // An ear twitch. One pixel of the left ear tip erased for a few frames, every ~13s. Absurdly
      // small, and the kind of thing you notice without noticing.
      const twitch = !reduce && awake && t % 13_000 < 220;
      if (twitch) {
        px(kx + sp.ox + 4, y + sp.oy, sc.wallTop);
        px(kx + sp.ox + 4, y + sp.oy + 1, L.fur);
      }

      // Zzz. She is asleep for a large part of any given day, and a sleeping cat with no sign of
      // sleeping is just a cat sitting very still.
      if (sc.sleepy > 0.75 && !awake && !reduce) {
        for (let i = 0; i < 3; i++) {
          const p = (t / 3200 + i / 3) % 1;
          const zx = kx + 13 + Math.round(p * 7);
          const zy = Math.round(y + sp.oy - 1 - p * 12);
          const a2 = Math.sin(p * Math.PI) * 0.75;
          // White on a sunlit cream wall is invisible, which is how the z's spent their whole life
          // so far: present in every daytime frame and never once visible. Warm brown by day,
          // white only once the room is actually dark enough for white to read.
          const c = sc.sun > 0.3 ? `rgba(104,72,42,${a2 * 0.9})` : `rgba(255,255,255,${a2})`;
          // A three-pixel z: top bar, diagonal, bottom bar.
          px(zx, zy, c);
          px(zx + 1, zy, c);
          px(zx + 1, zy + 1, c);
          px(zx, zy + 2, c);
          px(zx + 1, zy + 2, c);
        }
      }

      // A second bed tap is an invitation she takes literally: three tiny dream stars rise from
      // the cushion while she settles. They are not a new state or a reward badge, just a glimpse
      // of what a particularly good nap might look like.
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
        /*
         * What is in the cloud: a few pixels each, in the last and largest puff. More detail at this
         * size reads as noise, and the line under the canvas is where the dream is actually legible.
         */
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
          // sun: a small warm square rather than an outline, since it is a patch of light.
          px(sx, sy, ink);
          px(sx + 1, sy, ink);
          px(sx, sy + 1, ink);
          px(sx + 1, sy + 1, ink);
        }
      }

      // Purring, shown rather than written: small marks rising off her.
      if (pet || sc.purring || slowBlinking) {
        const a = pet || slowBlinking ? 0.8 : 0.42;
        // Clamped inside her silhouette rather than a flat +10. The poses are different widths, and on
        // the narrow standing pose (the one a low mood puts at the door) a fixed offset put the marks
        // out in mid-air beside her, where they read as three stray pixels on the wall rather than as
        // anything coming off the cat.
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

      // Three quick little pats are an accidental rhythm, so she answers in one: a few low purr
      // waves spread from her instead of hearts bursting over her. It feels like the room joining
      // in for a second, then gets out of the way before it can become feedback for every pet.
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

      // ── snug ──────────────────────────────────────────────────────────────
      // A low mood draws the room in and warms it. Additive only, so "sad" can never make the room
      // look bleak. A ring of warm floor hugging her and nothing else: dithering the frame edge
      // instead read as a transparency grid, and widening it past her own 24px width read as a
      // dotted band lying near her rather than warmth gathering around her.
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
        width: "100%",
        height: "100%",
        imageRendering: "pixelated",
        // Holding to pet needs the browser to stop treating the drag as a scroll. Only his side holds,
        // so everyone else keeps normal scrolling over the canvas.
        touchAction: role === "him" ? "none" : "manipulation",
        // The room responds to taps/presses; a grab hand promises a drag that does not exist.
        cursor: role ? "pointer" : "default",
      }}
    />
  );
}
