import { useEffect, useRef } from "react";
import type { Cat as CatLook, Clock, Mood } from "./types.js";
import { sceneFor } from "./hours.js";
import { mothAt } from "./critters.js";
import { BED, DOOR, FRAME, MRRP, PLANT, POSES, SHELF, TAIL, WINDOW, type Pose, type Sprite } from "./sprites.js";

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
/** The window is bolted to the wall here. Only the light it throws moves. */
const WIN_X = 60, WIN_CX = WIN_X + 8;

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
    const fit = () => {
      const r = cv.getBoundingClientRect();
      const d = Math.min(2, devicePixelRatio || 1);
      cv.width = Math.max(GW, Math.round(r.width * d));
      cv.height = Math.max(GH, Math.round(r.height * d));
      s = cv.width / GW;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(cv);

    const ptr = { x: GW / 2, y: FLOOR + 10, in: false };
    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      ptr.x = ((e.clientX - r.left) / r.width) * GW;
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
      return { x: ((e.clientX - r.left) / r.width) * GW, y: ((e.clientY - r.top) / r.height) * GH };
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
      if (!c || x < 0 || y < 0 || x >= GW || y >= GH) return;
      const X = Math.round(x * s), Y = Math.round(y * s);
      g.fillStyle = c;
      g.fillRect(X, Y, Math.round((x + 1) * s) - X, Math.round((y + 1) * s) - Y);
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
      blit(WINDOW, WIN_X + shake("window"), 4, { w: INK, h: sc.sun > 0.2 ? sc.beamWarm : sc.wallTop });
      blit(SHELF, 80 + shake("shelf"), FLOOR - 24, { w: INK, d: "#8a6a48" });
      blit(DOOR, 6 + shake("door"), FLOOR - 16, { w: INK, f: sc.wallBottom, d: "#8a6a48", h: "#ffe9a8" });
      blit(FRAME, 16 + shake("frame"), 12, { w: INK, f: "#c69a63", h: "#cfe0e4", g: "#e2926f" });
      blit(PLANT, 87 + shake("plant"), FLOOR - 13, { g: LEAF, w: INK, d: "#b07a4e" });
      // Dusty rose, not the lavender it started as. Lavender was the only cool colour in a room of
      // creams and browns, and at this size it stopped reading as a cat bed and started reading as
      // a stray UI element that had landed on the floor.
      blit(BED, 24 + shake("bed"), FLOOR + 22, { d: "#b07f76", f: "#d8a79c", b: "#c4918a" });

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
      const wantX = sc.catX * GW;
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
      const forced = eyesRef.current || (looking && !reduce);
      const open = forced ? 1 : pet ? 0 : Math.max(sc.eyes, n);
      const awake = forced || (open > 0.4 && !blink);
      const posed = open > 0.4; // ignores the blink: her pose must not flicker with her eyelids
      const pose: Pose = sc.pose ?? (sc.atDoor ? "stand" : posed ? "sit" : "loaf");
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
