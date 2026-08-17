import { useEffect, useRef } from "react";
import type { Cat as CatLook, Clock, Gift, Mood } from "./types.js";
import { mixHex, sceneFor, type LightPhase } from "./hours.js";
import { fireflyAt, mothAt } from "./critters.js";
import { play, playPianoNote } from "./sound.js";
import { dreamOf, type Dream, type DreamContext, type DreamScene } from "./dreams.js";
import { catCallCode } from "./secrets.js";
import { mouseRunAt } from "./mouse.js";
import { BUBBLE_GAME_MS, bubbleMomentAt, bubbleSeeds, type BubbleSeed } from "./bubbles.js";
import { PIANO_CODE, PIANO_MS, advancePawMelody, pianoKeyAt, pianoKeys } from "./piano.js";
import { collectConstellationStar, constellationProgress, CONSTELLATION_KEYS, type ConstellationKey } from "./constellation.js";
import type { DiscoveryKey } from "./discoveries.js";
import { INTERACTION_ART, INTERACTION_BLEND_MODE, type InteractionArtKey } from "./interactionArt.js";
import { BED, BOX_BACK, DOOR, EK, FRAME, MRRP, PLANT, POSES, SHELF, TAIL, WINDOW, type Pose, type Sprite } from "./sprites.js";

/**
 * The room, drawn as pixel art at her local time of day.
 *
 * Interaction geometry stays on the room's original fixed 100x80 grid while generated image layers
 * provide the visible room, cat, and effects.
 *
 * The light and the palette come from her clock. What she's doing comes from what she told the cat.
 */

const GW = 100, GH = 80, FLOOR = 48;
/**
 * How much of the room is on screen at once.
 *
 * The room is authored 100 wide and cropped to VW, following her and clamped to the walls. She is 24
 * across, so the full grid left her a quarter of the frame and the detail built into her (the blink,
 * the ear twitch, the stretch) too small to read. Cropping rather than scaling keeps one logical pixel
 * to one aligned rectangle, which is the rule the whole look depends on. The view moves smoothly so
 * the pan reads as a camera rather than a jump.
 */
const VW = 80;
/** The window is bolted to the wall here. Only the light it throws moves. */
const WIN_X = 60, WIN_CX = WIN_X + 8;
/** Where a box sits when there is one. Right of the beam, clear of the bed. */
const BOX_X = 44, BOX_Y = FLOOR + 9;
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
const ROOM_CODE = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight"];
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
 * Where it comes to rest, having rolled.
 *
 * Not directly under the shelf, which is where it would land and also where nobody would ever see
 * it: the shelf is at 80 and the camera only ever shows 80 of the room's 100 columns, so a mug at
 * 83 is off-screen unless she happens to be standing at the right-hand wall. Out here it is in
 * frame wherever she is. Mugs roll, so this costs nothing in plausibility and is the difference
 * between a thing you find and a thing that is technically in the room.
 */
const MUG_FLOOR_X = 66, MUG_FLOOR_Y = FLOOR + 14;

/** Things in a room, not a menu of interactions. Nothing hints which objects hold a secret. */
const PROP_LABELS: Record<string, string> = {
  window: 'the window',
  frame: 'the picture on the wall',
  shelf: 'the shelf',
  door: 'the door',
  plant: 'the plant',
  bed: 'her bed',
  box: 'the box',
};

/**
 * The furniture, with its boxes.
 *
 * One table so drawing and hit-testing cannot disagree. Every sprite has a zero offset except BED,
 * whose ox is -11, which is why its box starts left of its draw x.
 */
const PROPS = [
  { key: "window", sp: WINDOW, x: WIN_X, y: 4 },
  { key: "frame", sp: FRAME, x: 16, y: 12 },
  { key: "shelf", sp: SHELF, x: 80, y: FLOOR - 24 },
  { key: "door", sp: DOOR, x: 35, y: FLOOR - 16 },
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
const DYNAMIC_INTERACTION_ART: InteractionArtKey[] = [
  "leaf", "moth", "yarn", "treat", "catnip", "mouse", "piano", "bird", "steam",
  "shootingStar", "constellation", "rainbow", "aurora", "note", "sparkles", "bloom",
];
const GENERATED_EFFECTS = [
  "speech", "sleep", "purr", "dream", "laser", "firefly",
  "music", "heart", "memory", "wish", "mug", "tour", "box", "door",
] as const;
type GeneratedEffectKey = typeof GENERATED_EFFECTS[number];

const GENERATED_ROOMS: Record<LightPhase, string> = {
  dawn: "/art/room-dawn-v1.png",
  day: "/art/room-day-v1.png",
  golden: "/art/room-golden-v1.png",
  evening: "/art/room-evening-v1.png",
  night: "/art/room-night-v1.png",
};

export const generatedRoomFor = (phase: LightPhase, raining = false): string =>
  raining ? "/art/room-rain-v1.png" : GENERATED_ROOMS[phase];

export const generatedCatFor = (pose: Pose): string => `/art/cat/${pose}-v3.png`;
export const generatedEyesFor = (pose: Pose): string => `/art/cat-eyes/${pose}-v3.png`;

export function generatedEyeFilter(eyes: string): string {
  switch (eyes.toLowerCase()) {
    case "#d79a2b": return "hue-rotate(-58deg) saturate(1.35) brightness(1.08)";
    case "#b4652c": return "hue-rotate(-78deg) saturate(1.4) brightness(.9)";
    case "#69a4c4": return "hue-rotate(92deg) saturate(.88) brightness(1.08)";
    case "#8e9aa0": return "grayscale(1) saturate(0) brightness(1.03)";
    default: return "none";
  }
}

/** Palette treatments keep one locked generated silhouette set instead of generating 72 drifting cats. */
export function generatedCatFilter(look: CatLook): string {
  switch (look.fur.toLowerCase()) {
    case "#e8cfa8": return "sepia(.2) saturate(.62) brightness(1.08)";
    case "#9aa0a8": return "grayscale(.78) saturate(.45) brightness(.98) contrast(.92)";
    case "#4b444a": return "grayscale(.9) saturate(.35) brightness(.58) contrast(1.18)";
    case "#f6f1e8": return "grayscale(.86) saturate(.25) brightness(1.24) contrast(.84)";
    case "#a4703f": return "sepia(.35) saturate(.82) brightness(.76) contrast(1.08)";
    case "#3f3a40": return "grayscale(.95) saturate(.22) brightness(.54) contrast(1.28)";
    case "#e3a95f": return "sepia(.18) saturate(.78) brightness(.94) contrast(1.04)";
    default: return "none";
  }
}

/*
 * Closed eyes are authored as lines, not as recolored open-eye blocks.
 *
 * The sprite role `e` occupies a two- or three-pixel area so an open colored eye can carry a white
 * highlight. Painting that entire area brown when she slept produced two heavy rectangles that read
 * like sunglasses, especially on the new smaller loaf. These coordinates replace those areas with
 * one intentional line per eye while preserving the same customizable open-eye sprites.
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
  /** What the room says in words. The visual room is otherwise silent to a screen reader. */
  label: string;
  look: CatLook;
  clock: Clock;
  /** What you told her. Changes what she does, never what the room's light does. */
  mood: Mood | null;
  /** Bumped whenever an action happens, so she reacts to it. */
  nudge: number;
  /**
   * Hold her eyes open regardless of the hour. Set while the setup panel is open.
   *
   * Shut eyes are drawn as a line in the outline colour, not as a smaller eye, so when she is asleep
   * her eye colour is not on screen at all. That made every swatch in the picker look identical and
   * the whole control read as broken, when in fact it was saving correctly the entire time. You
   * cannot choose a colour you cannot see.
   */
  eyesOpen?: boolean;
  /** He has taken her photo, so the picture on the wall is her. */
  framed?: boolean;
  /**
   * When somebody walked in, as ms epoch, or null for a shut door.
   *
   * A banner is the app telling you someone arrived; the door is the room doing it, and her looking
   * up at it is the part that matters.
   *
   * A timestamp rather than a boolean: accumulating swing progress per frame into a ref left the
   * door permanently ajar, because this component remounts often enough to reset it mid-swing.
   * Deriving progress from a fixed moment also survives a dropped frame or a backgrounded tab.
   */
  doorOpenAt?: number | null;
  /**
   * There is a box in the room today, so she is probably in it.
   *
   * Whether she is *in* it is decided here rather than on the server, because it is a drawing
   * decision, not shared state: both people see the same box in the same place either way.
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
   * Who is looking, which decides what touching the cat does. Petting is his; she gets a poke that is
   * purely local; a spectator and the landing page get neither. The furniture is tappable for everyone,
   * because nothing about it touches the server.
   */
  role?: "him" | "her" | null;
  /**
   * You are both in the room at this moment.
   *
   * She gets up, comes to the middle and purrs. Presence outranks both her mood and the hour for
   * where she is and what she's doing, and touches nothing about the light — see sceneFor.
   */
  together?: boolean;
  /** He held on the cat. Fires once per press. */
  onPet?: () => void;
  /** She tapped her own cat. Local only, no request. */
  onPoke?: () => void;
  /** Reported up so the other seat can be told. This stays ignorant of rooms and the network. */
  onFound?: (key: DiscoveryKey) => void;
  /** Exposes a PNG capture of the composited generated room. */
  onCapture?: (capture: () => Promise<Blob | null>) => void;
  /** The furniture secrets were reachable only by hit-tested room taps, so two of the largest were
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
  const interactionSurfaceRef = useRef<HTMLDivElement>(null);
  const roomRootRef = useRef<HTMLDivElement>(null);
  const roomImageRef = useRef<HTMLImageElement>(null);
  const doorImageRef = useRef<HTMLImageElement>(null);
  const catImageRef = useRef<HTMLImageElement>(null);
  const eyeImageRef = useRef<HTMLImageElement>(null);
  const interactionImageRefs = useRef<Partial<Record<InteractionArtKey, HTMLImageElement>>>({});
  const bubbleImageRefs = useRef<Array<HTMLImageElement | null>>([]);
  const generatedEffectRefs = useRef<Partial<Record<GeneratedEffectKey, HTMLDivElement>>>({});
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
   * Zoomies: when the next one is due, and when the current one started.
   *
   * The only thing she does that nothing causes. Everything else in this room is a response, to a
   * mood or a tap or somebody arriving, and a cat that only ever responds is a puppet. This one
   * has no trigger and no explanation, which is exactly what it is like to live with a cat.
   */
  const zoom = useRef({ next: 0, start: -1e9 });
  /**
   * A bird on the sill, and how long it stays.
   *
   * Purely local and deliberately not shared. Everything else added to this room is state both of
   * them see, but a bird is a moment, not a fact about the room: telling the other person a bird
   * happened four hours ago would be a notification, and this app does not have those.
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
  const bubbleGame = useRef<{ startedAt: number; seeds: BubbleSeed[]; popped: Set<number>; completedAt: number; lastPop: { x: number; y: number; at: number } | null }>({
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
    const surface = interactionSurfaceRef.current;
    if (!surface) return;

    /*
     * A synthetic pointer event, not a second code path: the furniture handler is ~180 lines that grows
     * with every secret, and a parallel keyboard branch would drift from it immediately.
     *
     * The x needs the live camera pan, since the room is wider than the view and scrolls with her.
     */
    const poke = (key: string): void => {
      const prop = PROPS.find((p) => p.key === key);
      if (!prop) return;
      const rect = surface.getBoundingClientRect();
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
        pointerType: 'mouse',
        isPrimary: true,
      };
      /*
       * The pointer handler focuses the surface so a code can be typed after a tap. On a keyboard that drags
       * focus out of the room list every time, making the six-object room tour a chore.
       */
      const before = document.activeElement as HTMLElement | null;
      surface.dispatchEvent(new PointerEvent('pointerdown', init));
      surface.dispatchEvent(new PointerEvent('pointerup', init));
      if (before && before !== surface && document.activeElement === surface) before.focus({ preventScroll: true });
    };

    onProps(
      PROPS.map((p) => ({ key: p.key, label: PROP_LABELS[p.key] ?? p.key })),
      poke,
    );
  }, [onProps]);

  useEffect(() => {
    if (!onCapture) return;
    onCapture(() =>
      new Promise((resolve) => {
        const room = roomRootRef.current;
        if (!room) return resolve(null);

        const bounds = room.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0) return resolve(null);

        const scale = Math.min(2, devicePixelRatio || 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bounds.width * scale));
        canvas.height = Math.max(1, Math.round(bounds.height * scale));
        const context = canvas.getContext("2d");
        if (!context) return resolve(null);

        context.scale(scale, scale);
        for (const layer of room.querySelectorAll<HTMLElement>("img, [data-capture-effect]")) {
          const style = getComputedStyle(layer);
          if (style.display === "none" || style.visibility === "hidden") continue;
          if (layer instanceof HTMLImageElement && (!layer.complete || layer.naturalWidth === 0)) continue;

          const opacity = Number.parseFloat(style.opacity);
          if (opacity <= 0) continue;

          const layerBounds = layer.getBoundingClientRect();
          const x = layerBounds.left - bounds.left;
          const y = layerBounds.top - bounds.top;
          const width = layerBounds.width;
          const height = layerBounds.height;
          if (width <= 0 || height <= 0) continue;

          context.save();
          context.globalAlpha = Number.isFinite(opacity) ? opacity : 1;
          context.globalCompositeOperation = style.mixBlendMode === "screen" ? "screen" : "source-over";
          context.filter = style.filter === "none" ? "none" : style.filter;
          if (!(layer instanceof HTMLImageElement)) {
            if (style.backgroundColor !== "rgba(0, 0, 0, 0)") {
              context.fillStyle = style.backgroundColor;
              context.fillRect(x, y, width, height);
            }
            const borderWidth = Number.parseFloat(style.borderTopWidth);
            if (borderWidth > 0) {
              context.lineWidth = borderWidth;
              context.strokeStyle = style.borderTopColor;
              context.strokeRect(x + borderWidth / 2, y + borderWidth / 2, width - borderWidth, height - borderWidth);
            }
            context.fillStyle = style.color;
            context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillText(layer.textContent ?? "", x + width / 2, y + height / 2);
          } else if (style.objectFit === "cover") {
            const sourceRatio = layer.naturalWidth / layer.naturalHeight;
            const targetRatio = width / height;
            let sourceX = 0;
            let sourceY = 0;
            let sourceWidth = layer.naturalWidth;
            let sourceHeight = layer.naturalHeight;
            if (sourceRatio > targetRatio) {
              sourceWidth = layer.naturalHeight * targetRatio;
              sourceX = (layer.naturalWidth - sourceWidth) / 2;
            } else {
              sourceHeight = layer.naturalWidth / targetRatio;
              sourceY = (layer.naturalHeight - sourceHeight) / 2;
            }
            context.drawImage(layer, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
          } else {
            context.drawImage(layer, x, y, width, height);
          }
          context.restore();
        }

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
    const surface = interactionSurfaceRef.current!;
    let stopped = false;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const generatedImageLoads = new Map<string, Promise<void>>();
    const loadGeneratedImage = (src: string): Promise<void> => {
      const cached = generatedImageLoads.get(src);
      if (cached) return cached;
      const loading = new Promise<void>((resolve) => {
        const image = new Image();
        image.onload = () => resolve();
        image.onerror = () => resolve();
        image.src = src;
      });
      generatedImageLoads.set(src, loading);
      return loading;
    };
    for (const pose of Object.keys(POSES) as Pose[]) {
      void loadGeneratedImage(generatedCatFor(pose));
      void loadGeneratedImage(generatedEyesFor(pose));
    }

    /** The view's left edge, in grid columns. Recomputed once per frame from where she is. */
    let cam = 0;

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
      const r = surface.getBoundingClientRect();
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
     * Taps are hit-tested here, against the same coordinates the draw code uses.
     *
     * This used to be a bare div stretched over the whole stage in App, which meant a tap could only
     * ever mean one thing, and the room's furniture could not respond to being touched at all: the
     * positions it would need to test against live in this file. Owning the geometry and owning the
     * pointer belong together.
     */
    const gridAt = (e: PointerEvent) => {
      const r = surface.getBoundingClientRect();
      return { x: cam + ((e.clientX - r.left) / r.width) * VW, y: ((e.clientY - r.top) / r.height) * GH };
    };
    const onDown = (e: PointerEvent) => {
      surface.focus({ preventScroll: true });
      const { x, y } = gridAt(e);
      ptr.x = x; ptr.y = y; ptr.in = true;
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
        if (roleRef.current === "him") { petting.current = true; onPetRef.current?.(); }
        else if (roleRef.current === "her") onPokeRef.current?.();
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
      const hit = PROPS.find((q) =>
        (q.key !== "box" || boxIsHere) && x >= q.x && x < q.x + q.sp.w && y >= q.y && y < q.y + q.sp.h,
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
        }
        else {
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
    const onCancel = () => { petting.current = false; floorPress.current = null; };
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
          -Math.max(TYPED_ROOM_CODE.length, SUMMON_CODE.length, BOX_CODE.length, YARN_CODE.length, TREAT_CODE.length, CATNIP_CODE.length, MUSIC_CODE.length, MOUSE_CODE.length, BUBBLE_CODE.length, PIANO_CODE.length, STARS_CODE.length, nameCode?.length ?? 0),
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
           * Once both of them have called her, she sometimes actually comes.
           *
           * Not every time: a cat that arrives on command is a dog, and the whole point of this one is
           * that turning up is her idea. Rare enough to stay a surprise, and reusing the summon she
           * already knows rather than inventing a second walk.
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
    surface.addEventListener("pointermove", onMove);
    surface.addEventListener("pointerleave", onLeave);
    surface.addEventListener("pointerdown", onDown);
    surface.addEventListener("pointerup", onUp);
    surface.addEventListener("pointercancel", onCancel);
    surface.addEventListener("keydown", onKey);

    /*
     * Generated images own every visible pixel now. The old scene code still calculates interaction
     * geometry and animation state used by the DOM layers, but its drawing vocabulary is deliberately
     * inert. Keeping these typed no-ops temporarily lets that state be extracted in smaller, testable
     * steps without paying for thousands of invisible canvas writes on every frame.
     */
    const px: (x: number, y: number, color: string) => void = () => undefined;
    const rect: (x: number, y: number, width: number, height: number, color: string) => void = () => undefined;
    const dither: (x: number, y: number, width: number, height: number, color: string, phase?: number) => void = () => undefined;
    const blit: (sprite: Sprite, x: number, y: number, palette: Record<string, string>, flip?: boolean) => void = () => undefined;

    const placeGeneratedInteraction = (
      key: InteractionArtKey,
      visible: boolean,
      x: number,
      y: number,
      width: number,
    ) => {
      const image = interactionImageRefs.current[key];
      if (!image) return;
      image.style.display = visible ? "block" : "none";
      if (!visible) return;
      image.style.left = `${((x - cam) / VW) * 100}%`;
      image.style.top = `${(y / GH) * 100}%`;
      image.style.width = `${width}%`;
    };

    const placeGeneratedEffect = (
      key: GeneratedEffectKey,
      visible: boolean,
      x: number,
      y: number,
      text: string,
    ) => {
      const effect = generatedEffectRefs.current[key];
      if (!effect) return;
      effect.style.display = visible ? "block" : "none";
      if (!visible) return;
      effect.style.left = `${((x - cam) / VW) * 100}%`;
      effect.style.top = `${(y / GH) * 100}%`;
      effect.textContent = text;
    };

    let raf = 0;
    const frame = (t: number) => {
      /*
       * How far open the door is, 0..3. Computed here rather than at the draw call because the
       * camera needs it too.
       *
       * Open fast, shut slow. A door is thrown open and eases back, and the slow close is what
       * gives her time to look at it.
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
      if (doorImageRef.current) {
        const generatedDoor = doorProg > 0.35 ? INTERACTION_ART.doorOpen : INTERACTION_ART.doorClosed;
        if (!doorImageRef.current.src.endsWith(generatedDoor)) doorImageRef.current.src = generatedDoor;
      }

      /*
       * The camera leans toward the door while it is open.
       *
       * Without this the feature is usually invisible: the view is 80 of 100 columns and follows
       * her, so the door at column 6 is only in frame when she happens to be left of centre.
       *
       * Blended by how far open the door is rather than clamped, so the view glides over and back
       * with the swing instead of snapping the instant the flag flips.
       */
      const camBase = Math.max(0, Math.min(GW - VW, Math.round((catX.current ?? GW / 2) - VW / 2)));
      const pull = doorProg / 3;
      cam = Math.round(camBase * (1 - pull) + Math.min(camBase, 2) * pull);
      camRef.current = cam;
      const L = lookRef.current;
      const sc = sceneFor(clockRef.current, Date.now(), moodRef.current, togetherRef.current);
      if (doorImageRef.current) {
        doorImageRef.current.style.filter = sc.lightPhase === "night"
          ? "brightness(.68) saturate(.72)"
          : sc.lightPhase === "evening"
            ? "brightness(.82) saturate(.82)"
            : "brightness(.95) saturate(.88)";
      }
      const beamX = Math.round(sc.beam * GW);

      // Generated layers consume the interaction state that used to be interleaved with room painting.
      const rainRemaining = plantTaps.current.rainUntil - t;
      const raining = rainRemaining > 0;
      const generatedRoom = generatedRoomFor(sc.lightPhase, raining);
      if (roomImageRef.current && !roomImageRef.current.src.endsWith(generatedRoom)) {
        roomImageRef.current.src = generatedRoom;
      }
      const night = sc.lightPhase === "night";
      const wx = WIN_X;
      const birding = t - bird.current < BIRD_MS;
      const starAge = t - shootingStar.current;
      const stargazing = !reduce && night && starAge >= 0 && starAge < STAR_MS;
      const constellating = night && t < windowTaps.current.constellationUntil;
      const sunCatching = !reduce && !night && t < windowTaps.current.sunCatcherUntil;
      const aurora = !reduce && night && t < auroraUntil.current;
      const rainbowing = !reduce && rainRemaining <= 0 && t < plantTaps.current.rainbowUntil;
      const plantBlooming = !reduce && t >= plantTaps.current.rainbowUntil && t < plantTaps.current.bloomUntil;
      const generatedMoth = reduce ? null : mothAt(t, beamX);
      const boxHere = boxRef.current || t < secretBoxUntil.current;
      const inBox = boxHere && !sc.atDoor;
      const peeking = !reduce && boxHere && t < boxPeekUntil.current;
      const boxPlaying = !reduce && boxHere && t < boxTaps.current.playUntil;
      const roomPartyRemaining = roomTour.current.partyUntil - t;

      // ── her ───────────────────────────────────────────────────────────────
      // Zoomies. Rare and unannounced: first one somewhere in the first couple of minutes, then
      // every two to four. Only two things stop it: a mood that has her leaving, and anyone who
      // asked for less motion, since this is nothing but motion.
      //
      // Deliberately NOT gated on her being awake. That was the first version and it meant she
      // almost never zoomed, because the scene calls her drowsy for most of the day. It is also
      // backwards: a cat detonating out of a dead sleep is the entire phenomenon.
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
      const mouseMoment = reduce && t - mouseStartedAt.current < MOUSE_MS
        ? { x: 72, y: FLOOR + 17, presence: 1, phase: 'peek' as const }
        : mouseRunAt(t - mouseStartedAt.current, MOUSE_MS);
      const mouseVisiting = mouseMoment !== null && !sc.atDoor;
      const mouseChasing = mouseVisiting && !reduce && mouseMoment.phase !== 'peek';
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

      for (let index = 0; index < bubbleImageRefs.current.length; index++) {
        const image = bubbleImageRefs.current[index];
        if (!image) continue;
        const bubble = liveBubbles[index];
        image.style.display = bubble ? "block" : "none";
        if (!bubble) continue;
        image.style.left = `${((bubble.x - cam) / VW) * 100}%`;
        image.style.top = `${(bubble.y / GH) * 100}%`;
        image.style.opacity = String(bubble.presence);
      }

      placeGeneratedInteraction("yarn", yarnPlaying, yarnX, FLOOR + 16, 20);
      placeGeneratedInteraction("treat", treating, TREAT_X, FLOOR + 16, 15);
      placeGeneratedInteraction("catnip", catnipActive && catnipProgress < 0.32, CATNIP_X, FLOOR + 15, 17);
      placeGeneratedInteraction("mouse", mouseVisiting, mouseMoment?.x ?? 0, mouseMoment?.y ?? FLOOR, 13);
      placeGeneratedInteraction("piano", pianoPlaying, pianoGame.current.center, FLOOR + 17, 38);
      placeGeneratedInteraction("bird", birding, wx + 7, 15, 13);
      placeGeneratedInteraction("steam", t - mugSteamedAt.current < MUG_STEAM_MS, 82, 28, 15);
      placeGeneratedInteraction("shootingStar", stargazing, WIN_X + 8, 10, 18);
      placeGeneratedInteraction("constellation", constellating, WIN_X + 8, 10, 19);
      placeGeneratedInteraction("rainbow", rainbowing, WIN_X + 8, 11, 20);
      placeGeneratedInteraction("aurora", aurora, WIN_X + 8, 10, 24);
      placeGeneratedInteraction("bloom", plantBlooming, 91, FLOOR - 15, 15);
      placeGeneratedInteraction("note", t < doorTaps.current.noteUntil, 13, FLOOR - 3, 16);
      const leafProgress = (t - fallingLeaf.current) / LEAF_FALL_MS;
      placeGeneratedInteraction("leaf", leafProgress >= 0 && leafProgress < 1, 91 + Math.sin(leafProgress * Math.PI * 2) * 4, FLOOR - 15 + leafProgress * 18, 9);
      placeGeneratedInteraction("moth", !!generatedMoth && sc.sun > 0.15, generatedMoth?.x ?? 0, generatedMoth?.y ?? 0, 8);
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
       * In the bed she sits lower.
       *
       * The floor has perspective: things drawn further down are nearer the viewer. Her feet land
       * at FLOOR+19 and the bed's cushion is at FLOOR+24, so putting her at the bed's x alone left
       * her hovering a few pixels above it like a cat-shaped balloon. Coming forward as well as
       * across is what makes her be in it.
       */
      // She only sinks into the cushion once she has actually reached it. Lowering her while she
      // walked across the room made the invitation look like she was hovering over the floor.
      const settledInBed = sc.inBed || (nesting && Math.abs(kx - 24) < 8);
      const ky = FLOOR + 19 + (settledInBed ? 6 : 0);
      placeGeneratedInteraction(
        "sparkles",
        sc.sparkle || bubbleRewarding || pianoRewarding || roomPartyRemaining > 0 || sunCatching ||
          t < mugTaps.current.glowUntil || t < photoTaps.current.memoryUntil ||
          t < giftTaps.current.wishUntil || t - photoGlint.current < PHOTO_GLINT_MS ||
          t - giftGlint.current < PHOTO_GLINT_MS,
        kx,
        ky - 10,
        20,
      );
      const firefly = !reduce && sc.sun < 0.1 ? fireflyAt(t) : null;
      placeGeneratedEffect("speech", (birding || t < speakUntil.current) && !reduce, kx + 10, ky - 24, birding ? "ek!" : "mrrp");
      placeGeneratedEffect("purr", (petting.current || sc.purring || t < catTaps.current.chorusUntil) && !reduce, kx, ky - 17, ")))");
      placeGeneratedEffect("dream", t < bedTaps.current.dreamUntil && !reduce, 26, FLOOR + 10, "✦  ✧  ✦");
      placeGeneratedEffect("laser", laserPlaying, laser.current.x, laser.current.y, "•");
      placeGeneratedEffect("firefly", !!firefly, firefly?.x ?? 0, (firefly?.y ?? 0) + 14, "✦");
      placeGeneratedEffect("music", musicPlaying, kx, ky - 22, "♪  ♫  ♪");
      placeGeneratedEffect("heart", treating && treatProgress > 0.7 && !reduce, kx + 8, ky - 18, "♥");
      placeGeneratedEffect("memory", framedRef.current && t < photoTaps.current.memoryUntil && !reduce, 21, 10, "✦  ♡  ✦");
      placeGeneratedEffect("wish", !!giftRef.current && t < giftTaps.current.wishUntil && !reduce, 16, FLOOR + 5, "✧  ✦");
      placeGeneratedEffect("mug", t < mugTaps.current.glowUntil && !reduce, 82, 25, "✦");
      placeGeneratedEffect("tour", roomPartyRemaining > 0 && !reduce, GW / 2, 8, "✦   ✧   ✦   ✧   ✦");
      placeGeneratedEffect("box", (boxPlaying || peeking) && !reduce, BOX_X + 2, BOX_Y - 5, "⌁");
      placeGeneratedEffect("door", t < doorTaps.current.noteUntil && !reduce, 13, FLOOR - 16, "· · ·");

      const want = ptr.in ? Math.max(0, 1 - Math.hypot(ptr.x - kx, ptr.y - (ky - 8)) / 44) : 0;
      near.current += (want - near.current) * 0.07;
      const n = near.current;
      const pet = petting.current;
      bounce.current = Math.max(0, bounce.current - 0.02);

      // Stay quietly beside her and she returns the cat version of a smile. The cursor has to be
      // both close and still; merely passing over the room never triggers it, and moving away
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
      const forced = eyesRef.current || nameCalled || mouseVisiting || bubblePlaying || bubbleRewarding || pianoPawing || pianoRewarding || (looking && !reduce) || doorRef.current !== null || musicPlaying || catnipActive || zooming || laserPlaying || yarnPlaying || treating || summoning || birding || stargazing || constellating || sunCatching || rainbowing || plantBlooming || peeking;
      const open = forced ? 1 : pet ? 0 : Math.max(sc.eyes, n);
      const awake = !slowBlinking && (forced || (open > 0.4 && !blink));
      placeGeneratedEffect("sleep", sc.sleepy > 0.75 && !awake && !reduce, kx + 13, ky - 21, "z  z  z");
      const posed = open > 0.4; // ignores the blink: her pose must not flicker with her eyelids
      // A door opening beats whatever she was doing. Perk is the ears-up, head-turned pose, and it
      // outranks the mood pose deliberately: a cat that stays loafed while a door swings open is a
      // cat that did not notice, which is the one thing this feature is for.
      const noticing = (mouseVisiting || doorRef.current !== null || birding || stargazing || constellating || sunCatching || rainbowing || plantBlooming || peeking) && posed;
      const stretchCycle = t % 40_000;
      const stretching = !reduce && awake && sc.play < 0.5 && !inBox && Math.abs(wantX - kx) < 2 && stretchCycle < 1400;
      const pouncing = mouseChasing || laserPlaying;
      const walking = Math.abs(wantX - kx) > 3 && !zooming && !catnipping && !pouncing;
      const pose: Pose = inBox
        ? "peek"
        : stretching
          ? "stretch"
          : pouncing
            ? "pounce"
            : walking
              ? "walk"
              : bubblePlaying || pianoPawing || pianoRewarding || musicDancing || catnipping || zooming || yarnPlaying || summoning || (treating && treatProgress < 0.6)
                ? "play"
                : musicPlaying || catnipActive || treating
                  ? "sit"
                  : noticing
                    ? "perk"
                    : (sc.pose ?? (sc.atDoor ? "stand" : posed ? "sit" : "loaf"));
      const sp = POSES[pose]!;

      // The generated cat is the visible character layer. The legacy sprite still runs invisibly
      // below it for exact hit geometry while interactions migrate to generated overlays.
      if (catImageRef.current && eyeImageRef.current) {
        const catImage = catImageRef.current;
        const eyeImage = eyeImageRef.current;
        const generatedCat = generatedCatFor(pose);
        const generatedEyes = generatedEyesFor(pose);
        if (catImage.dataset.pose !== pose && catImage.dataset.requestedPose !== pose) {
          catImage.dataset.requestedPose = pose;
          void Promise.all([loadGeneratedImage(generatedCat), loadGeneratedImage(generatedEyes)]).then(() => {
            if (stopped || catImage.dataset.requestedPose !== pose) return;
            catImage.src = generatedCat;
            eyeImage.src = generatedEyes;
            catImage.dataset.pose = pose;
            eyeImage.dataset.pose = pose;
            delete catImage.dataset.requestedPose;
          });
        }
        const left = `${((kx - cam) / VW) * 100}%`;
        const bottom = settledInBed ? "1%" : "6%";
        catImage.style.left = left;
        catImage.style.bottom = bottom;
        catImage.style.filter = generatedCatFilter(L);
        eyeImage.style.left = left;
        eyeImage.style.bottom = bottom;
        eyeImage.style.filter = generatedEyeFilter(L.eyes);
      }

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
       * A mood changes one small thing around her, not the weather and never the whole palette.
       *
       * The pose already carries most of the response; these floor-level details make the moods
       * legible as authored little scenes when two poses happen to share a silhouette. They stay
       * close to the cat and use room colours so they read as belongings, not status effects. The
       * motion is optional decoration only: reduced motion keeps the same objects and meaning.
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
            px(px0 - 1, py0, "rgba(104,75,50,.45)"); px(px0 + 1, py0, "rgba(104,75,50,.45)");
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
        px(mx - 4, my, body); px(mx - 3, my - 1, body); px(mx - 2, my - 1, body);
        rect(mx - 1, my - 2, 4, 3, body);
        px(mx + 2, my - 3, ear);
        px(mx + 2, my - 2, `rgba(74,53,32,${alpha})`);
        if (!reduce && mouseMoment!.phase === 'dash') {
          px(mx, my + 1, `rgba(116,91,72,${alpha * 0.6})`);
          px(mx + 3, my + 1, `rgba(116,91,72,${alpha * 0.6})`);
        }
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
      const tailX = pose === "loaf" ? kx + 8 : pose === "stretch" ? kx + 14 : pose === "pounce" ? kx + 9 : kx + 5;
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

      // The bubbles are drawn in front of her because they are targets, not ambient particles.
      // Each has a bright edge, a glassy blue shadow, and one moving highlight; five taps completes
      // the scene and turns the last pop into a brief ring of hearts around the cat.
      for (const bubble of liveBubbles) {
        const bx = Math.round(bubble.x);
        const by = Math.round(bubble.y);
        const edge = `rgba(165,215,232,${bubble.presence * 0.9})`;
        const shine = `rgba(255,255,245,${bubble.presence})`;
        px(bx - 2, by - 1, edge); px(bx - 2, by, edge); px(bx - 1, by - 2, edge);
        px(bx + 1, by - 2, edge); px(bx + 2, by - 1, edge); px(bx + 2, by, edge);
        px(bx - 1, by + 2, edge); px(bx, by + 2, edge); px(bx + 1, by + 1, edge);
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
          const angle = i * (Math.PI * 2 / 5) + (reduce ? 0 : t / 850);
          const hx = Math.round(kx + Math.cos(angle) * 15);
          const hy = Math.round(y - 7 + Math.sin(angle) * 9);
          const heart = `rgba(232,120,140,${fade})`;
          px(hx, hy, heart); px(hx + 2, hy, heart);
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
          const note = i % 2 === 0 ? `rgba(232,169,181,${fade * (1 - progress * 0.5)})` : `rgba(255,232,143,${fade * (1 - progress * 0.5)})`;
          px(nx, ny, note); px(nx, ny + 1, note); px(nx + 1, ny, note);
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
          px(hx, hy, c); px(hx + 2, hy, c);
          rect(hx - 1, hy + 1, 5, 1, c);
          rect(hx, hy + 2, 3, 1, c);
          px(hx + 1, hy + 3, c);
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
        laserTrail.current = laserTrail.current.filter(point => t - point.at < 520);
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
        px(hx, hy, hc); px(hx + 2, hy, hc);
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
          const nc = i % 2 === 0
            ? `rgba(126,102,181,${alpha})`
            : `rgba(232,120,140,${alpha})`;
          rect(nx, ny, 2, 2, nc);
          rect(nx + 1, ny - 4, 1, 5, nc);
          if (i % 2 === 0) px(nx + 2, ny - 4, nc);
        }
      }
      // The moth, drawn before her so she can be in front of it, and so its position is known when
      // her eyes are drawn.
      const m = generatedMoth;
      if (m && sc.sun > 0.15) {
        const mx = Math.round(m.x), my = Math.round(m.y);
        // One-pixel wings that alternate, which at this scale is all a flap needs to be.
        const flap = Math.sin(t / 90) > 0 ? 1 : 0;
        const a2 = 0.35 + m.presence * 0.65;
        px(mx, my, `rgba(246,234,208,${a2})`);
        px(mx - 1, my - flap, `rgba(232,214,180,${a2})`);
        px(mx + 1, my - flap, `rgba(232,214,180,${a2})`);
      }

      /*
       * One white pixel per eye, and WHICH pixel is the whole trick.
       *
       * Shifting the highlight by a single pixel is the difference between a cat staring through you and
       * a cat looking at something. She prefers the moth, falls back to your cursor, and otherwise looks
       * straight ahead.
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
        const at = mouseVisiting ? mouseMoment!.x : looking ? la!.x : m && sc.sun > 0.15 ? m.x : ptr.in ? ptr.x : null;
        // Only 3px-wide eyes have room to shift; a 2px eye would spill onto the fur.
        const look = !e.wide || at === null ? 0 : Math.sign(at - kx) * (Math.abs(at - kx) > 4 ? 1 : 0);
        px(kx + e.l + look, ey, WHITE);
        px(kx + e.r + look, ey, WHITE);
      }

      // The thing she knocked off, on the floor below the shelf it fell from. Outlined, or it
      // disappears into the lit floorboards.
      if (sc.play > 0.5) {
        px(85, FLOOR + 7, INK); px(86, FLOOR + 7, INK);
        px(85, FLOOR + 8, PINK); px(86, FLOOR + 8, PINK);
        px(85, FLOOR + 9, INK); px(86, FLOOR + 9, INK);
      }

      if (pet) {
        const p = (t / 1100) % 1;
        const hy = Math.round(y + sp.oy - 4 - p * 10);
        const hx = kx + 8;
        const c = `rgba(232,120,140,${1 - p})`;
        px(hx, hy, c); px(hx + 2, hy, c);
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
          px(sx, sy, c); px(sx - 1, sy + 1, c); px(sx + 1, sy + 1, c); px(sx, sy + 2, c);
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
          const color = i % 2 === 0
            ? `rgba(255,232,143,${fade})`
            : `rgba(240,174,180,${fade * 0.9})`;
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
          const fx = Math.round(f.x), fy = Math.round(f.y + 14);
          px(fx, fy, `rgba(255,236,140,${a})`);
          px(fx - 1, fy, `rgba(255,222,110,${a * 0.35})`);
          px(fx + 1, fy, `rgba(255,222,110,${a * 0.35})`);
          px(fx, fy - 1, `rgba(255,222,110,${a * 0.35})`);
        }
      }

      // ── mrrp ──────────────────────────────────────────────────────────────
      // She says the thing the app is named after, whenever anything happens to her: a pet, a brush,
      // a mood tapped. Drawn after her so the bubble sits in front, and clamped inside the frame so a
      // cat standing at either wall still gets a whole bubble rather than a clipped one.
      // The chatter wins the bubble while a bird is there: "mrrp" is what she says to you, and she
      // is not talking to you right now.
      if ((birding || t < speakUntil.current) && !reduce) {
        const BW = 21, BH = 8;
        const bx = Math.max(1, Math.min(GW - BW - 1, kx + 4));
        const by = y + sp.oy - 12;
        rect(bx + 1, by, BW - 2, BH, WHITE); // body, corners left off so it reads as rounded
        rect(bx, by + 1, BW, BH - 2, WHITE);
        rect(bx + 1, by, BW - 2, 1, INK);
        rect(bx + 1, by + BH - 1, BW - 2, 1, INK);
        rect(bx, by + 1, 1, BH - 2, INK);
        rect(bx + BW - 1, by + 1, 1, BH - 2, INK);
        // A two-pixel tail dropping toward her head.
        px(bx + 4, by + BH, WHITE); px(bx + 3, by + BH, INK); px(bx + 5, by + BH, INK);
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
          px(zx, zy, c); px(zx + 1, zy, c);
          px(zx + 1, zy + 1, c);
          px(zx, zy + 2, c); px(zx + 1, zy + 2, c);
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
          px(dx, dy, c); px(dx - 1, dy + 1, c); px(dx + 1, dy + 1, c); px(dx, dy + 2, c);
        }
        /*
         * What is in the cloud.
         *
         * A few pixels each, in the last and largest puff. Any more detail at this size reads as noise,
         * and the line the room says underneath is where the dream is actually legible.
         */
        const sx = 18 + 2 * 4;
        const sy = FLOOR + 18 - Math.round(p * 12) - 4;
        const ink = `rgba(120,96,60,${a * 0.8})`;
        if (bedTaps.current.scene === "mouse") {
          px(sx, sy, ink); px(sx + 1, sy, ink); px(sx + 2, sy + 1, ink); px(sx - 1, sy + 1, ink);
        } else if (bedTaps.current.scene === "fish") {
          px(sx, sy, ink); px(sx + 1, sy, ink); px(sx + 2, sy - 1, ink); px(sx + 2, sy + 1, ink);
        } else if (bedTaps.current.scene === "stars") {
          px(sx, sy - 1, ink); px(sx + 2, sy, ink); px(sx + 1, sy + 2, ink);
        } else if (bedTaps.current.scene === "moth") {
          px(sx, sy, ink); px(sx + 2, sy, ink); px(sx + 1, sy + 1, ink);
        } else if (bedTaps.current.scene === "piano") {
          px(sx, sy, ink); px(sx + 1, sy, ink); px(sx + 2, sy, ink); px(sx + 1, sy + 1, ink);
        } else if (bedTaps.current.scene === "box") {
          px(sx, sy, ink); px(sx + 1, sy, ink); px(sx + 2, sy, ink);
          px(sx, sy + 1, ink); px(sx + 2, sy + 1, ink);
        } else if (bedTaps.current.scene === "brush") {
          px(sx, sy, ink); px(sx + 1, sy + 1, ink); px(sx + 2, sy + 2, ink);
        } else {
          // sun: a small warm square rather than an outline, since it is a patch of light.
          px(sx, sy, ink); px(sx + 1, sy, ink); px(sx, sy + 1, ink); px(sx + 1, sy + 1, ink);
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
        for (const [dy, w] of [[1, 20], [2, 24], [3, 26], [4, 24], [5, 18]] as const) {
          dither(kx - (w >> 1), ky + dy, w, 1, sc.patch);
        }
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      surface.removeEventListener("pointermove", onMove);
      surface.removeEventListener("pointerleave", onLeave);
      surface.removeEventListener("pointerdown", onDown);
      surface.removeEventListener("pointerup", onUp);
      surface.removeEventListener("pointercancel", onCancel);
      surface.removeEventListener("keydown", onKey);
    };
  }, []);

  const initialScene = sceneFor(clock, Date.now(), mood, together);
  const initialPose = initialScene.pose ?? (initialScene.atDoor ? "stand" : initialScene.sleepy > 0.55 ? "loaf" : "sit");

  return (
    <div ref={roomRootRef} className="generated-room" style={{ position: "relative", width: "100%", height: "100%" }}>
      <img
        ref={roomImageRef}
        src={generatedRoomFor(sceneFor(clock, Date.now(), mood, together).lightPhase)}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", objectPosition: "center", imageRendering: "pixelated",
        }}
      />
      <img
        ref={doorImageRef}
        src={doorOpenAt ? INTERACTION_ART.doorOpen : INTERACTION_ART.doorClosed}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          position: "absolute", left: "30%", top: "31%", width: "30%", height: "auto",
          objectFit: "contain", imageRendering: "pixelated", pointerEvents: "none",
          filter: "brightness(.68) saturate(.72)",
        }}
      />
      {shelfDown && (
        <img
          src={INTERACTION_ART.fallenMug}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            position: "absolute", left: "59%", bottom: "7%", width: "12%", height: "auto",
            objectFit: "contain", imageRendering: "pixelated", pointerEvents: "none",
          }}
        />
      )}
      {gift && (
        <img
          src={INTERACTION_ART[gift]}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            position: "absolute", left: "8%", bottom: "8%", width: "22%", height: "auto",
            objectFit: "contain", imageRendering: "pixelated", pointerEvents: "none",
            mixBlendMode: INTERACTION_BLEND_MODE,
          }}
        />
      )}
      {cake && (
        <img
          src={INTERACTION_ART.cake}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            position: "absolute", left: "33%", bottom: "3%", width: "24%", height: "auto",
            objectFit: "contain", imageRendering: "pixelated", pointerEvents: "none",
            mixBlendMode: INTERACTION_BLEND_MODE,
          }}
        />
      )}
      {windowLight && (
        <img
          src={INTERACTION_ART.windowLight}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            position: "absolute", left: "7%", top: "17%", width: "20%", height: "auto",
            objectFit: "contain", imageRendering: "pixelated", pointerEvents: "none",
            mixBlendMode: INTERACTION_BLEND_MODE,
            animation: "room-glimmer 1.8s ease-in-out infinite alternate",
          }}
        />
      )}
      {DYNAMIC_INTERACTION_ART.map((key) => (
        <img
          key={key}
          ref={(image) => { interactionImageRefs.current[key] = image ?? undefined; }}
          src={INTERACTION_ART[key]}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            position: "absolute", display: "none", height: "auto",
            transform: "translate(-50%, -50%)", objectFit: "contain",
            imageRendering: "pixelated", pointerEvents: "none",
            mixBlendMode: INTERACTION_BLEND_MODE,
          }}
        />
      ))}
      {Array.from({ length: 5 }, (_, index) => (
        <img
          key={`bubble-${index}`}
          ref={(image) => { bubbleImageRefs.current[index] = image; }}
          src={INTERACTION_ART.bubble}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            position: "absolute", display: "none", width: "13%", height: "auto",
            transform: "translate(-50%, -50%)", objectFit: "contain",
            imageRendering: "pixelated", pointerEvents: "none",
            mixBlendMode: INTERACTION_BLEND_MODE,
          }}
        />
      ))}
      <img
        ref={catImageRef}
        src={generatedCatFor(initialPose)}
        data-pose={initialPose}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          position: "absolute", left: `${initialScene.catX * 100}%`, bottom: "6%",
          width: "43%", height: "auto", transform: "translateX(-50%)",
          imageRendering: "pixelated", pointerEvents: "none",
          filter: generatedCatFilter(look),
          transition: "left .45s var(--ease-spring), bottom .3s ease",
        }}
      />
      <img
        ref={eyeImageRef}
        src={generatedEyesFor(initialPose)}
        data-pose={initialPose}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          position: "absolute", left: `${initialScene.catX * 100}%`, bottom: "6%",
          width: "43%", height: "auto", transform: "translateX(-50%)",
          imageRendering: "pixelated", pointerEvents: "none",
          filter: generatedEyeFilter(look.eyes),
          transition: "left .45s var(--ease-spring), bottom .3s ease",
        }}
      />
      {GENERATED_EFFECTS.map((key) => (
        <div
          key={key}
          ref={(effect) => { generatedEffectRefs.current[key] = effect ?? undefined; }}
          data-capture-effect={key}
          aria-hidden="true"
          style={{
            position: "absolute", display: "none", transform: "translate(-50%, -50%)",
            pointerEvents: "none", zIndex: 3, whiteSpace: "nowrap",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontWeight: 800, fontSize: key === "laser" ? "20px" : key === "heart" ? "18px" : "clamp(10px, 1.8vw, 15px)",
            lineHeight: 1, letterSpacing: key === "sleep" ? ".12em" : 0,
            color: key === "laser" ? "#ff6b6b" : key === "heart" ? "#ef8fa0" : key === "firefly" ? "#ffe68f" : "#fff3c2",
            textShadow: key === "laser" ? "0 0 5px #ff8f8f" : "0 1px 2px #4a3520, 0 0 6px rgba(255,230,143,.55)",
            ...(key === "speech" ? {
              padding: "5px 7px", color: "#4a3520", background: "#fffdf6",
              border: "2px solid #4a3520", borderRadius: "8px", textShadow: "none",
            } : {}),
          }}
        />
      ))}
      <div
        ref={interactionSurfaceRef}
        role="img"
        tabIndex={0}
        aria-label={`${label} The room has quiet interactive details.`}
        style={{
          position: "absolute", inset: 0, display: "block", width: "100%", height: "100%",
          opacity: 0,
          // Holding to pet needs the browser to stop treating the drag as a scroll. Only his side holds,
          // so everyone else keeps normal scrolling over the room.
          touchAction: role === "him" ? "none" : "manipulation",
          // The room responds to taps/presses; a grab hand promises a drag that does not exist.
          cursor: role ? "pointer" : "default",
        }}
      />
    </div>
  );
}
