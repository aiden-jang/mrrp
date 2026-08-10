import { useEffect, useRef } from "react";
import type { Cat as CatLook, Clock, Gift, Mood } from "./types.js";
import { mixHex, sceneFor } from "./hours.js";
import { fireflyAt, mothAt } from "./critters.js";
import { play } from "./sound.js";
import { BED, BIRD, BOX_BACK, BOX_FRONT, DOOR, EK, DOOR_FRAMES, GIFT_CAP, GIFT_LEAF, GIFT_MOTH, MUG, MUG_DOWN, FRAME, FRAME_CAT, MRRP, PLANT, POSES, SHELF, TAIL, WINDOW, type Pose, type Sprite } from "./sprites.js";

/**
 * The room, drawn as pixel art at her local time of day.
 *
 * Everything is placed on a fixed 100x80 grid and each logical pixel is painted as one aligned
 * rectangle. No offscreen buffer and no upscaling: resampling a small canvas upward is what leaves
 * you with pixels of two different sizes, and that reads as a mistake rather than a style.
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
/** The room's keyboard secret only paints the night window, never the whole screen. */
const AURORA_MS = 5600;
const ROOM_CODE = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight"];
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

/**
 * The furniture, with its boxes.
 *
 * One table so that drawing and hit-testing cannot disagree. Every sprite here has a zero offset
 * except BED, whose ox is -11, which is why its box starts left of its draw x.
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
const LEAF = "#7d9e63";
const WHITE = "#fffdf6";

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
  shelfDown = false,
  onTidy,
  role = null,
  together = false,
  onPet,
  onPoke,
  onCapture,
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
  /** Exposes a PNG capture of the rendered room without leaking the canvas out of this component. */
  onCapture?: (capture: () => Promise<Blob | null>) => void;
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
  /** Looking twice is a little different from looking once. */
  const windowTaps = useRef({ count: 0, last: -1e9, constellationUntil: -1e9, sunCatcherUntil: -1e9 });
  /** When the box gets a tap, she rises just far enough to be caught looking. */
  const boxPeekUntil = useRef(-1e9);
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
  /** A gift only sparkles after someone notices what she carried in. */
  const giftGlint = useRef(-1e9);
  /** A second knock means somebody is playing with the door, so the room plays back. */
  const doorTaps = useRef({ count: 0, last: -1e9, noteUntil: -1e9 });
  /** A tiny keyboard secret. It is local, ephemeral, and only visible through the night window. */
  const auroraUntil = useRef(-1e9);
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
  roleRef.current = role;
  onPetRef.current = onPet;
  onPokeRef.current = onPoke;

  /** True while he is holding on her. Owned here rather than by the caller, see the pointer setup. */
  const petting = useRef(false);
  /** Her box in grid space, refreshed every frame, so a tap can be tested against where she actually is. */
  const catBox = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  /** The last bit of furniture somebody touched, and when. */
  const poked = useRef<{ key: string; at: number } | null>(null);
  /** Something worth looking at, and until when. */
  const lookAt = useRef<{ x: number; until: number } | null>(null);

  const near = useRef(0);
  const catX = useRef<number | null>(null);
  const bounce = useRef(0);
  const lastNudge = useRef(nudge);

  useEffect(() => {
    if (!onCapture) return;
    onCapture(() =>
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

    const ptr = { x: GW / 2, y: FLOOR + 10, in: false };
    let roomCodeAt = 0;
    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      ptr.x = cam + ((e.clientX - r.left) / r.width) * VW;
      ptr.y = ((e.clientY - r.top) / r.height) * GH;
      ptr.in = true;
    };
    const onLeave = () => { ptr.in = false; petting.current = false; lookAt.current = null; poked.current = null; };

    /*
     * Taps are hit-tested here, against the same coordinates the draw code uses.
     *
     * This used to be a bare div stretched over the whole stage in App, which meant a tap could only
     * ever mean one thing, and the room's furniture could not respond to being touched at all: the
     * positions it would need to test against live in this file. Owning the geometry and owning the
     * pointer belong together.
     */
    const gridAt = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      return { x: cam + ((e.clientX - r.left) / r.width) * VW, y: ((e.clientY - r.top) / r.height) * GH };
    };
    const onDown = (e: PointerEvent) => {
      cv.focus({ preventScroll: true });
      const { x, y } = gridAt(e);
      ptr.x = x; ptr.y = y; ptr.in = true;
      // Her first, and with a couple of pixels of slack, because a finger is much bigger than a cat
      // drawn 24 pixels wide.
      const b = catBox.current;
      if (b && x >= b.x0 - 2 && x <= b.x1 + 2 && y >= b.y0 - 2 && y <= b.y1 + 3) {
        if (roleRef.current === "him") { petting.current = true; onPetRef.current?.(); }
        else if (roleRef.current === "her") onPokeRef.current?.();
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
        giftGlint.current = performance.now();
        speakUntil.current = performance.now() + 800;
        lookAt.current = { x: 19, until: performance.now() + 1900 };
        play("mrrp");
        return;
      }
      const hit = PROPS.find((q) =>
        (q.key !== "box" || boxRef.current) && x >= q.x && x < q.x + q.sp.w && y >= q.y && y < q.y + q.sp.h,
      );
      let rainStarted = false;
      // The window has a daytime bird and a night-time shooting star. Neither is shared: they are
      // small things you happen to notice, not events the other person needs to be told about.
      if (hit?.key === "window") {
        const now = performance.now();
        const scene = sceneFor(clockRef.current, Date.now(), moodRef.current, togetherRef.current);
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
        }
        play("shutter");
      }
      if (hit?.key === "box" && boxRef.current) {
        boxPeekUntil.current = performance.now() + 1200;
        speakUntil.current = performance.now() + 800;
        play("mrrp");
      }
      if (hit?.key === "bed") {
        bedNestUntil.current = performance.now() + 8000;
      }
      if (hit?.key === "shelf" && !downRef.current) {
        mugSteamedAt.current = performance.now();
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
        }
        play("mrrp");
      }
      if (hit) {
        poked.current = { key: hit.key, at: performance.now() };
        // And she notices. Looking at the thing you touched is most of what makes the room feel lived
        // in, and it costs one number: the eye highlight already knows how to aim at an x.
        lookAt.current = {
          x: rainStarted ? WIN_CX : hit.x + hit.sp.w / 2,
          until: performance.now() + (rainStarted ? 4200 : 2400),
        };
      }
    };
    const onUp = () => { petting.current = false; ptr.in = true; };
    const onKey = (e: KeyboardEvent) => {
      // The room needs focus for its little code. Once it has it, arrow keys should not also scroll
      // the page away from the window while someone is trying the sequence.
      if (ROOM_CODE.includes(e.key)) e.preventDefault();
      const expected = ROOM_CODE[roomCodeAt];
      roomCodeAt = e.key === expected ? roomCodeAt + 1 : e.key === ROOM_CODE[0] ? 1 : 0;
      if (roomCodeAt === ROOM_CODE.length) {
        auroraUntil.current = performance.now() + AURORA_MS;
        speakUntil.current = performance.now() + 1000;
        roomCodeAt = 0;
      }
    };
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerleave", onLeave);
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointerup", onUp);
    cv.addEventListener("pointercancel", onUp);
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
      const X = Math.round(vx * s), Y = Math.round(y * s);
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
       * Skirting: one bright line where the wall meets the floor, to read as depth.
       *
       * Lifted out of the wall's own colour rather than painted a fixed near-white. One grid row is
       * about eleven screen pixels once the room is scaled up, so a flat #fffdf6 was not a highlight,
       * it was a white band lying across the room — brightest at midnight, when the rest of the room
       * is lavender and nothing in it should be glowing. Now it brightens with the hour, the way every
       * other surface here already does.
       */
      rect(0, FLOOR - 1, GW, 1, mixHex(sc.wallBottom, sc.beamWarm, 0.3 + sc.sun * 0.35));
      // Floorboards. Half the frame was empty boards, and three lines is enough to say "floor".
      for (const by of [FLOOR + 9, FLOOR + 15, FLOOR + 23, FLOOR + 30]) rect(0, by, GW, 1, sc.floorFar);


      // ── light ─────────────────────────────────────────────────────────────
      // A leaning shaft, solid down the middle and dithered at both edges so it fades off without
      // needing a gradient.
      // Solid fills from the lit palette. Glazing a translucent layer over dithered bands is what
      // produced vertical streaks: every row composited slightly differently and the seams lined up.
      // No `phase` here. Passing y made the parity (x + 2y), which depends on x alone, so the
      // "checkerboard" edges came out as vertical stripes down the wall.
      // The shaft pivots from a fixed window rather than sliding across the wall with the patch.
      // A window that moves collides with the picture and the door, and windows do not move.
      for (let y = 14; y < FLOOR; y++) {
        const k = (y - 14) / (FLOOR - 14);
        const cx = Math.round(WIN_CX + (beamX - WIN_CX) * k);
        rect(cx - 8, y, 16, 1, sc.litWall);
        dither(cx - 11, y, 3, 1, sc.litWall);
        dither(cx + 8, y, 3, 1, sc.litWall);
        // quarter density outside that, so the edge falls off in two steps rather than one
        for (const ox of [-13, -12, 10, 11]) if ((ox + y) % 4 === 0) px(cx + ox, y, sc.litWall);
      }
      // The pool of light on the boards. Its size is a shape problem, not a number: too short and it
      // sits at her head height as two pale wings either side of her ears; too wide and a mood that
      // moves her to the door leaves a big bright lens with nothing lying in it. Small solid core,
      // generous dithered edge, reaching far enough down the boards to pass under her at rows 49-66.
      const POOL = [
        [1, 16], [2, 20], [3, 24], [4, 26], [5, 26], [6, 24], [7, 22], [8, 18], [9, 14],
      ] as const;
      for (const [dy, w] of POOL) rect(beamX - (w >> 1), FLOOR + dy, w, 1, sc.patch);
      // The soft edge starts below her ear line. Dither running across the rows her ears occupy put a
      // checkerboard fan either side of her face, and speckle next to the one thing you are meant to
      // be looking at just reads as noise.
      dither(beamX - 15, FLOOR + 5, 30, 9, sc.patch);

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

      // Props AFTER the light. Drawn before it, the beam's dither punched holes through them.
      /*
       * The window at night.
       *
       * The glass used to be painted wall colour whenever the sun was down, so after dark the window
       * stopped being a window and became a rectangle drawn on a wall. That is the state this app is in
       * most of the time it is ever opened: the whole point of it is the two minutes before somebody
       * falls asleep. The most-seen version of the room had the least in it.
       */
      const night = sc.sun < 0.12;
      const wx = WIN_X + shake("window");
      blit(WINDOW, wx, 4, { w: INK, h: sc.sun > 0.2 ? sc.beamWarm : night ? "#2b3450" : sc.wallTop });
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
        // A crescent, made by drawing a full moon and biting a hole out of it with the night colour.
        rect(wx + 3, wy(1), 3, 1, "#f4e6b8");
        rect(wx + 2, wy(2), 4, 1, "#f4e6b8");
        rect(wx + 2, wy(3), 4, 1, "#f4e6b8");
        rect(wx + 3, wy(4), 3, 1, "#f4e6b8");
        rect(wx + 4, wy(1), 2, 1, "#2b3450");
        rect(wx + 4, wy(2), 2, 1, "#2b3450");
        // Stars, on their own slow twinkles so they never blink together.
        for (const [sx, sy, ph] of [[12, 2, 0], [14, 6, 0.45], [10, 7, 0.8], [7, 8, 0.25]] as const) {
          if (Math.sin(t / 900 + ph * 7) > -0.35) px(wx + sx, wy(sy), "#fff6dc");
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
          const points = [[4, 7], [7, 5], [10, 7], [13, 3]] as const;
          for (const [sx, sy] of points) px(wx + sx, wy(sy), c);
          for (const [sx, sy] of [[5, 7], [6, 6], [8, 5], [9, 6], [11, 6], [12, 4]] as const) {
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
            const color = row % 2 === 0
              ? `rgba(126,216,180,${fade * 0.7})`
              : `rgba(173,141,230,${fade * 0.55})`;
            for (let col = start; col < 15; col += 3) px(wx + col, wy(row), color);
          }
        }
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
      const rainRemaining = plantTaps.current.rainUntil - t;
      const rainbowing = !reduce && rainRemaining <= 0 && t < plantTaps.current.rainbowUntil;
      const plantBlooming = !reduce && t >= plantTaps.current.rainbowUntil && t < plantTaps.current.bloomUntil;
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
      blit(SHELF, 80 + shake("shelf"), FLOOR - 24, { w: INK, d: "#8a6a48" });
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
        px(nx, ny + 1, INK); px(nx + 5, ny + 2, INK);
        px(nx + 2, ny + 1, `rgba(198,154,99,${a})`);
      }
      if (framedRef.current) {
        blit(FRAME_CAT, 16 + shake("frame"), 12, { w: INK, f: "#c69a63", h: "#cfe0e4", c: L.fur, e: INK, n: PINK });
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
          px(hx, hy, c); px(hx + 2, hy, c); px(hx + 1, hy + 1, c); px(hx + 1, hy + 2, c);
        }
      }
      blit(PLANT, 87 + shake("plant"), FLOOR - 13, { g: LEAF, w: INK, d: "#b07a4e" });
      // The weather sequence ends where it began: one fresh little flower on the plant. It fades
      // away after a few seconds so the room never accumulates a permanent checklist of secrets.
      if (plantBlooming) {
        const a = Math.min(1, (plantTaps.current.bloomUntil - t) / 700);
        const c = `rgba(236,151,169,${a})`;
        px(93, FLOOR - 16, c); px(92, FLOOR - 15, c); px(94, FLOOR - 15, c); px(93, FLOOR - 14, "#e7c75f");
      }
      // A plant tap drops one leaf. It is intentionally a little easier to miss than the plant
      // itself: the pleasure is in catching it, not in being prompted to make it happen.
      const leafAge = t - fallingLeaf.current;
      if (!reduce && leafAge >= 0 && leafAge < LEAF_FALL_MS) {
        const p = leafAge / LEAF_FALL_MS;
        const lx = Math.round(93 + Math.sin(p * Math.PI * 2) * 3);
        const ly = Math.round(FLOOR - 16 + p * 22);
        px(lx, ly, LEAF);
        px(lx + (p < 0.5 ? 1 : -1), ly + 1, "#5d7a46");
      }
      // Dusty rose, not the lavender it started as. Lavender was the only cool colour in a room of
      // creams and browns, and at this size it stopped reading as a cat bed and started reading as
      // a stray UI element that had landed on the floor.
      blit(BED, 24 + shake("bed"), FLOOR + 22, { d: "#b07f76", f: "#d8a79c", b: "#c4918a" });
      // What she left, put down near the door rather than mid-floor: mid-floor is where she loafs, so
      // the first version was drawn perfectly and then covered by the cat every single time.
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
          px(gx, gy, c); px(gx - 1, gy, c); px(gx + 1, gy, c); px(gx, gy - 1, c); px(gx, gy + 1, c);
        }
      }
      // The box, back half. Sits right of centre so it does not fight the bed or the sunbeam, and
      // low enough on the boards to read as standing on them rather than floating.
      const boxHere = boxRef.current;
      const inBox = boxHere && !sc.atDoor;
      const peeking = !reduce && boxHere && t < boxPeekUntil.current;
      if (boxHere) {
        blit(BOX_BACK, BOX_X + shake("box"), BOX_Y, { w: INK, k: "#c69a63", s: "#a97f4d" });
      }

      if (!reduce) {
        for (const m of motes) {
          m.y -= m.sp;
          if (m.y < 14) { m.y = FLOOR - 1; m.dx = Math.floor(Math.random() * 15) - 7; }
          if (sc.sun > 0.25) {
            const k = Math.max(0, (m.y - 14) / (FLOOR - 14));
            const cx = Math.round(WIN_CX + (beamX - WIN_CX) * k);
            px(cx + m.dx, Math.floor(m.y), sc.beamWarm);
          }
        }
      }

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
      const wantX = zooming
        ? 10 + (Math.sin(zp * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5) * (GW - 34)
        : inBox
          ? BOX_X + 2
          : nesting
            ? 24
          : sc.catX * GW;
      if (catX.current === null) catX.current = wantX;
      // 0.012 took about 190 frames to cover a move, so more than three seconds of a cat inching across
      // the boards after a mood tap. It read as lag rather than as walking. 0.05 lands in well under a
      // second and still moves like a cat crossing a room rather than teleporting.
      catX.current += (wantX - catX.current) * (zooming ? 0.4 : 0.05);
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

      const want = ptr.in ? Math.max(0, 1 - Math.hypot(ptr.x - kx, ptr.y - (ky - 8)) / 44) : 0;
      near.current += (want - near.current) * 0.07;
      const n = near.current;
      const pet = petting.current;
      bounce.current = Math.max(0, bounce.current - 0.02);

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
      const forced = eyesRef.current || (looking && !reduce) || doorRef.current !== null || zooming || birding || stargazing || constellating || sunCatching || rainbowing || plantBlooming || peeking;
      const open = forced ? 1 : pet ? 0 : Math.max(sc.eyes, n);
      const awake = forced || (open > 0.4 && !blink);
      const posed = open > 0.4; // ignores the blink: her pose must not flicker with her eyelids
      // A door opening beats whatever she was doing. Perk is the ears-up, head-turned pose, and it
      // outranks the mood pose deliberately: a cat that stays loafed while a door swings open is a
      // cat that did not notice, which is the one thing this feature is for.
      const noticing = (doorRef.current !== null || birding || stargazing || constellating || sunCatching || rainbowing || plantBlooming || peeking) && posed;
      const pose: Pose = zooming ? "play" : noticing ? "perk" : (sc.pose ?? (sc.atDoor ? "stand" : posed ? "sit" : "loaf"));
      const sp = POSES[pose]!;

      const breathe = reduce || pose !== "loaf" ? 0 : Math.round(Math.sin(t / 1100));
      const hop =
        Math.round(bounce.current * 3) +
        (reduce || sc.play <= 0.5 ? 0 : Math.round(Math.abs(Math.sin(t / 260)) * 2));
      // The box front still covers the rest of her, so this reads as a shy answer from inside it
      // rather than a generic jump animation pasted over the furniture.
      const peekLift = peeking ? Math.round(Math.sin(((boxPeekUntil.current - t) / 1200) * Math.PI) * 5) : 0;
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
        h: WHITE,
        // Shut eyes are a one-pixel line in the outline colour, not a smaller eye.
        e: awake ? L.eyes : INK,
      };

      // Shadow first, so she sits on the floor instead of hovering over it.
      rect(kx - (sp.w >> 1) + 3, ky + 1, sp.w - 6, 1, "rgba(120,84,44,.26)");
      rect(kx - (sp.w >> 1) + 5, ky + 2, sp.w - 10, 1, "rgba(120,84,44,.18)");

      const wag = reduce ? 0 : Math.round(Math.sin(t / (620 - sc.play * 380)) * (1 + sc.play * 2 + n));
      // Tucked against her flank. A one-pixel gap here reads as a detached tail, which is worse
      // than no tail at all.
      const tailX = pose === "loaf" ? kx + 8 : kx + 5;
      const tailY = pose === "loaf" ? y - 4 : pose === "perk" ? y - 9 : y - 6;
      blit(TAIL, pose === "stand" ? kx - 12 : tailX, tailY + wag, pal, pose === "stand");
      blit(sp, kx, y, pal);
      // The box, near wall. Drawn after her, which is the whole reason the box is two sprites: this
      // is the line between a cat in a box and a cat standing behind one.
      if (boxHere) {
        blit(BOX_FRONT, BOX_X + shake("box"), BOX_Y + 3, { w: INK, k: "#d8ab72" });
      }

      // The moth, drawn before her so she can be in front of it, and so its position is known when
      // her eyes are drawn.
      const m = reduce ? null : mothAt(t, beamX);
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
        };
        const e = EYES[pose];
        // What you just touched wins, then the moth, then your cursor.
        const at = looking ? la!.x : m && sc.sun > 0.15 ? m.x : ptr.in ? ptr.x : null;
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

      // A stretch, roughly every 40 seconds, and only when she is awake and not busy being something
      // else. Rare on purpose: an idle animation you can predict stops reading as alive.
      const stretchCycle = t % 40_000;
      const stretching = !reduce && awake && sc.play < 0.5 && stretchCycle < 1400;
      if (stretching) {
        const k = Math.sin((stretchCycle / 1400) * Math.PI);
        const reach = Math.round(k * 5);
        // Front paws pushed forward along the floor, and a hint of arch in the back.
        rect(kx - (sp.w >> 1) - reach, ky - 1, reach + 2, 2, L.fur);
        px(kx - (sp.w >> 1) - reach, ky - 1, INK);
        px(kx - (sp.w >> 1) - reach, ky, INK);
      }

      // Purring, shown rather than written: small marks rising off her.
      if (pet || sc.purring) {
        const a = pet ? 0.8 : 0.42;
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
      cancelAnimationFrame(raf);
      ro.disconnect();
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerleave", onLeave);
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointerup", onUp);
      cv.removeEventListener("pointercancel", onUp);
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
        display: "block", width: "100%", height: "100%", imageRendering: "pixelated",
        // Holding to pet needs the browser to stop treating the drag as a scroll. Only his side holds,
        // so everyone else keeps normal scrolling over the canvas.
        touchAction: role === "him" ? "none" : "manipulation",
        // The room responds to taps/presses; a grab hand promises a drag that does not exist.
        cursor: role ? "pointer" : "default",
      }}
    />
  );
}
