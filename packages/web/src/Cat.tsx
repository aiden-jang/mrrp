import { useEffect, useRef } from "react";
import type { Cat as CatLook, Clock, Gift, Mood } from "./types.js";
import { sceneFor } from "./hours.js";
import { mothAt } from "./critters.js";
import { BED, BOX_BACK, BOX_FRONT, DOOR, DOOR_FRAMES, GIFT_CAP, GIFT_LEAF, GIFT_MOTH, FRAME, FRAME_CAT, MRRP, PLANT, POSES, SHELF, TAIL, WINDOW, type Pose, type Sprite } from "./sprites.js";

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
 * The room is authored 100 wide but only VW of it is shown, with the view following her and clamped to
 * the walls. She is 24 pixels across, so on the full grid she was a quarter of the frame with a lot of
 * empty wall around her, and everything built into her at that size (the irregular blink, the highlight
 * tracking the moth, the ear twitch, the stretch) was too small to read. Cropping rather than redrawing
 * her keeps one logical pixel to one aligned rectangle, which is the rule the whole look depends on.
 *
 * The side effect is a room that pans, so the door and the plant come and go. That reads as a camera
 * rather than a mistake, which is why the view moves smoothly with her instead of jumping.
 */
const VW = 80;
/** The window is bolted to the wall here. Only the light it throws moves. */
const WIN_X = 60, WIN_CX = WIN_X + 8;
/** Where a box sits when there is one. Right of the beam, clear of the bed. */
const BOX_X = 44, BOX_Y = FLOOR + 9;

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
  role = null,
  onPet,
  onPoke,
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
   * The room already knew when both people were present and said so in a banner. A banner is the
   * app telling you something happened; the door is the room doing it. She looks up at it, which
   * is the part that matters: presence you can see her notice.
   *
   * A timestamp rather than a boolean, because the first version accumulated progress per frame
   * into a ref and never got past a third open: this component remounts often enough that the ref
   * kept resetting mid-swing, leaving the door permanently ajar. Progress derived from a fixed
   * moment is immune to that, and it also stays correct if a frame is dropped or the tab is
   * backgrounded halfway through the swing.
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
  /**
   * Who is looking, which decides what touching the cat does. Petting is his; she gets a poke that is
   * purely local; a spectator and the landing page get neither. The furniture is tappable for everyone,
   * because nothing about it touches the server.
   */
  role?: "him" | "her" | null;
  /** He held on the cat. Fires once per press. */
  onPet?: () => void;
  /** She tapped her own cat. Local only, no request. */
  onPoke?: () => void;
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
  /** Where the swing had got to when the door was told to shut, so the close eases from there. */
  const doorShutFrom = useRef({ at: 0, from: 0 });
  lookRef.current = look;
  clockRef.current = clock;
  moodRef.current = mood;

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
    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      ptr.x = cam + ((e.clientX - r.left) / r.width) * VW;
      ptr.y = ((e.clientY - r.top) / r.height) * GH;
      ptr.in = true;
    };
    const onLeave = () => { ptr.in = false; petting.current = false; };

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
      const hit = PROPS.find((q) => x >= q.x && x < q.x + q.sp.w && y >= q.y && y < q.y + q.sp.h);
      if (hit) {
        poked.current = { key: hit.key, at: performance.now() };
        // And she notices. Looking at the thing you touched is most of what makes the room feel lived
        // in, and it costs one number: the eye highlight already knows how to aim at an x.
        lookAt.current = { x: hit.x + hit.sp.w / 2, until: performance.now() + 2400 };
      }
    };
    const onUp = () => { petting.current = false; };
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerleave", onLeave);
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointerup", onUp);
    cv.addEventListener("pointercancel", onUp);

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
      cam = Math.max(0, Math.min(GW - VW, Math.round((catX.current ?? GW / 2) - VW / 2)));
      const L = lookRef.current;
      const sc = sceneFor(clockRef.current, Date.now(), moodRef.current);
      const beamX = Math.round(sc.beam * GW);

      // ── room ──────────────────────────────────────────────────────────────
      // Flat bands with a dithered seam, not a gradient. Bands are what make a room read as pixel
      // art; a smooth ramp just reads as a photograph with large pixels.
      rect(0, 0, GW, FLOOR - 9, sc.wallTop);
      rect(0, FLOOR - 9, GW, 9, sc.wallBottom);
      rect(0, FLOOR, GW, 10, sc.floorFar);
      rect(0, FLOOR + 10, GW, GH - FLOOR - 10, sc.floorNear);
      rect(0, FLOOR - 1, GW, 1, WHITE); // skirting: one bright line reads as depth
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
      // The shaft stops at the floor. What lands on the floor is the patch, and drawing both left a
      // wide bright smear across the boards.
      //
      // The patch reaches down the boards far enough to pass under her, because she lies at rows
      // 49-66 and the first version stopped at 55. All you saw of it was two pale wings sticking
      // out either side of her head, which reads as a halo or a rendering fault rather than as
      // sunlight. A cat asleep in a pool of light is the entire picture, so the pool has to be
      // big enough to be one.
      // Small solid core, generous soft edge. Getting this wrong in both directions is instructive:
      // too short (stopping at FLOOR+7) and it sat at her head height, so all you saw of it was two
      // pale wings either side of her ears. Too big (38 wide, 13 rows) and it read as light right up
      // until a mood moved her to the door, at which point a large bright lens with nothing lying in
      // it dominated the room and looked like a rendering fault.
      //
      // The fix is not a size, it's a shape: mostly dither, so it reads as light on boards whether or
      // not there is a cat in it, and it still reaches far enough down the floor to pool around her.
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
      }
      blit(SHELF, 80 + shake("shelf"), FLOOR - 24, { w: INK, d: "#8a6a48" });
      {
        // Open fast, shut slow. A door is thrown open and eases back, and the slow close is what
        // gives her time to look at it.
        const now = Date.now();
        const openAt = doorRef.current;
        let prog: number;
        if (openAt) {
          prog = Math.min(3, ((now - openAt) / 260) * 3);
          doorShutFrom.current = { at: now, from: prog };
        } else {
          const since = now - doorShutFrom.current.at;
          prog = Math.max(0, doorShutFrom.current.from * (1 - since / 900));
        }
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
      if (framedRef.current) {
        blit(FRAME_CAT, 16 + shake("frame"), 12, { w: INK, f: "#c69a63", h: "#cfe0e4", c: L.fur, e: INK, n: PINK });
      } else {
        blit(FRAME, 16 + shake("frame"), 12, { w: INK, f: "#c69a63", h: "#cfe0e4", g: "#e2926f" });
      }
      blit(PLANT, 87 + shake("plant"), FLOOR - 13, { g: LEAF, w: INK, d: "#b07a4e" });
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
      }
      // The box, back half. Sits right of centre so it does not fight the bed or the sunbeam, and
      // low enough on the boards to read as standing on them rather than floating.
      const boxHere = boxRef.current;
      const inBox = boxHere && !sc.atDoor;
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
      // A box in the room outranks wherever the mood was going to put her, because that is what a
      // box does to a cat. A mood that sends her to the door still wins: leaving is leaving.
      const wantX = inBox ? BOX_X + 2 : sc.catX * GW;
      if (catX.current === null) catX.current = wantX;
      // 0.012 took about 190 frames to cover a move, so more than three seconds of a cat inching across
      // the boards after a mood tap. It read as lag rather than as walking. 0.05 lands in well under a
      // second and still moves like a cat crossing a room rather than teleporting.
      catX.current += (wantX - catX.current) * 0.05;
      const kx = Math.round(catX.current);
      const ky = FLOOR + 19;

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
      const forced = eyesRef.current || (looking && !reduce) || doorRef.current !== null;
      const open = forced ? 1 : pet ? 0 : Math.max(sc.eyes, n);
      const awake = forced || (open > 0.4 && !blink);
      const posed = open > 0.4; // ignores the blink: her pose must not flicker with her eyelids
      // A door opening beats whatever she was doing. Perk is the ears-up, head-turned pose, and it
      // outranks the mood pose deliberately: a cat that stays loafed while a door swings open is a
      // cat that did not notice, which is the one thing this feature is for.
      const noticing = doorRef.current !== null && posed;
      const pose: Pose = noticing ? "perk" : (sc.pose ?? (sc.atDoor ? "stand" : posed ? "sit" : "loaf"));
      const sp = POSES[pose]!;

      const breathe = reduce || pose !== "loaf" ? 0 : Math.round(Math.sin(t / 1100));
      const hop =
        Math.round(bounce.current * 3) +
        (reduce || sc.play <= 0.5 ? 0 : Math.round(Math.abs(Math.sin(t / 260)) * 2));
      const y = ky + breathe - hop;
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
        const f = mothAt(t + 47_000, GW / 2);
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
      if (t < speakUntil.current && !reduce) {
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
        blit(MRRP, bx + 2, by + 2, { w: INK });
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
      // The answer to a low mood: the room draws in and warms up around her. Additive only, so
      // "sad" can never make her room look bleak.
      // Two rings of dither at the very edge of the frame, and nothing else. Enough to feel the room
      // close in, small enough that it never looks like a transparency grid.
      // A ring of warm floor around her and nothing else. The frame dither I tried first read as a
      // transparency grid, which is the single most dated-looking thing a canvas can do.
      //
      // It hugs her: she is 24 wide, and a 38-wide ring stopped reading as warmth gathering around
      // her and started reading as a dotted band lying across the floor near her. Widening the sun
      // pool made it worse, because two checkerboards of the same colour on the same rows stack into
      // something that just looks like the boards are damaged.
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
    };
  }, []);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={label}
      style={{
        display: "block", width: "100%", height: "100%", imageRendering: "pixelated",
        // Holding to pet needs the browser to stop treating the drag as a scroll. Only his side holds,
        // so everyone else keeps normal scrolling over the canvas.
        touchAction: role === "him" ? "none" : "manipulation",
        cursor: role ? "grab" : "default",
      }}
    />
  );
}
