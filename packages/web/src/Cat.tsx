import { useEffect, useRef } from "react";
import type { Cat as CatLook, Clock, Mood } from "./types.js";
import { sceneFor } from "./hours.js";
import { DOOR, PLANT, POSES, RUG, SHELF, TAIL, WINDOW, type Pose, type Sprite } from "./sprites.js";

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

/** Fixed colours. Everything else comes from `look`, so she stays recolourable. */
const INK = "#4a3520";
const PINK = "#e79ba3";
const BLUSH = "#f0aeb4";
const LEAF = "#7d9e63";
const WHITE = "#fffdf6";

export function Cat({
  look,
  clock,
  mood,
  petting,
  nudge,
}: {
  look: CatLook;
  clock: Clock;
  /** What you told her. Changes what she does, never what the room's light does. */
  mood: Mood | null;
  petting: boolean;
  /** Bumped whenever an action happens, so she reacts to it. */
  nudge: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const petRef = useRef(petting);
  const lookRef = useRef(look);
  const clockRef = useRef(clock);
  const moodRef = useRef(mood);
  petRef.current = petting;
  lookRef.current = look;
  clockRef.current = clock;
  moodRef.current = mood;

  const near = useRef(0);
  const catX = useRef<number | null>(null);
  const bounce = useRef(0);
  const lastNudge = useRef(nudge);

  useEffect(() => {
    if (nudge !== lastNudge.current) {
      lastNudge.current = nudge;
      bounce.current = 1;
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
    const onLeave = () => { ptr.in = false; };
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerleave", onLeave);

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
      for (const by of [FLOOR + 10, FLOOR + 18, FLOOR + 26]) rect(0, by, GW, 1, sc.floorFar);


      // ── light ─────────────────────────────────────────────────────────────
      // A leaning shaft, solid down the middle and dithered at both edges so it fades off without
      // needing a gradient.
      // Solid fills from the lit palette. Glazing a translucent layer over dithered bands is what
      // produced vertical streaks: every row composited slightly differently and the seams lined up.
      // No `phase` here. Passing y made the parity (x + 2y), which depends on x alone, so the
      // "checkerboard" edges came out as vertical stripes down the wall.
      for (let y = 14; y < FLOOR; y++) {
        const cx = beamX + Math.round((y - FLOOR) * 0.22);
        rect(cx - 8, y, 16, 1, sc.litWall);
        dither(cx - 11, y, 3, 1, sc.litWall);
        dither(cx + 8, y, 3, 1, sc.litWall);
      }
      // The shaft stops at the floor. What lands on the floor is the patch, and drawing both left a
      // wide bright smear across the boards.
      for (const [dy, w] of [[0, 20], [1, 26], [2, 30], [3, 30], [4, 26], [5, 18]] as const) {
        rect(beamX - (w >> 1), FLOOR + dy, w, 1, sc.patch);
      }
      dither(beamX - 13, FLOOR + 1, 26, 5, sc.patch);

      // Props AFTER the light. Drawn before it, the beam's dither punched holes through them.
      const winX = Math.max(2, Math.min(GW - 19, beamX - 8));
      blit(WINDOW, winX, 4, { w: INK, h: sc.sun > 0.2 ? sc.beamWarm : sc.wallTop });
      blit(SHELF, 68, FLOOR - 26, { w: INK, d: "#8a6a48" });
      blit(DOOR, 6, FLOOR - 16, { w: INK, f: sc.wallBottom, d: "#8a6a48", h: "#ffe9a8" });
      blit(PLANT, 87, FLOOR - 13, { g: LEAF, w: INK, d: "#b07a4e" });
      blit(RUG, 44, FLOOR + 21, { d: "#9c7f86", f: "#bda0a4" });

      if (!reduce) {
        for (const m of motes) {
          m.y -= m.sp;
          if (m.y < 14) { m.y = FLOOR - 1; m.dx = Math.floor(Math.random() * 15) - 7; }
          if (sc.sun > 0.25) {
            const cx = beamX + Math.round((m.y - FLOOR) * 0.22);
            px(cx + m.dx, Math.floor(m.y), sc.beamWarm);
          }
        }
      }

      // ── her ───────────────────────────────────────────────────────────────
      const wantX = sc.catX * GW;
      if (catX.current === null) catX.current = wantX;
      catX.current += (wantX - catX.current) * 0.012;
      const kx = Math.round(catX.current);
      const ky = FLOOR + 13;

      const want = ptr.in ? Math.max(0, 1 - Math.hypot(ptr.x - kx, ptr.y - (ky - 8)) / 44) : 0;
      near.current += (want - near.current) * 0.07;
      const n = near.current;
      const pet = petRef.current;
      bounce.current = Math.max(0, bounce.current - 0.02);

      // Her eyes open on her own account (what you told her) or because you came close.
      const open = pet ? 0 : Math.max(sc.eyes, n);
      const awake = open > 0.4;
      const pose: Pose = sc.pose ?? (sc.atDoor ? "stand" : awake ? "sit" : "loaf");
      const sp = POSES[pose]!;

      const breathe = reduce || pose !== "loaf" ? 0 : Math.round(Math.sin(t / 1100));
      const hop =
        Math.round(bounce.current * 3) +
        (reduce || sc.play <= 0.5 ? 0 : Math.round(Math.abs(Math.sin(t / 260)) * 2));
      const y = ky + breathe - hop;

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
      dither(kx - (sp.w >> 1) + 2, ky + 1, sp.w - 4, 2, "rgba(120,84,44,.32)");

      const wag = reduce ? 0 : Math.round(Math.sin(t / (620 - sc.play * 380)) * (1 + sc.play * 2 + n));
      // Tucked against her flank. A one-pixel gap here reads as a detached tail, which is worse
      // than no tail at all.
      const tailX = pose === "loaf" ? kx + 8 : kx + 5;
      const tailY = pose === "loaf" ? y - 4 : y - 6;
      blit(TAIL, pose === "stand" ? kx - 12 : tailX, tailY + wag, pal, pose === "stand");
      blit(sp, kx, y, pal);

      // One white pixel per eye. This is the single pixel that makes her look alive.
      if (awake) {
        const ey = y + sp.oy + 6;
        const dx = pose === "loaf" ? 5 : pose === "play" ? 3 : 4;
        px(kx - dx, ey, WHITE);
        px(kx + dx - 1, ey, WHITE);
      }

      // The thing she knocked off, on the floor below the shelf it fell from. Outlined, or it
      // disappears into the lit floorboards.
      if (sc.play > 0.5) {
        px(73, FLOOR + 7, INK); px(74, FLOOR + 7, INK);
        px(73, FLOOR + 8, PINK); px(74, FLOOR + 8, PINK);
        px(73, FLOOR + 9, INK); px(74, FLOOR + 9, INK);
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

      // Purring, shown rather than written: small marks rising off her.
      if (pet || sc.purring) {
        const a = pet ? 0.8 : 0.42;
        for (let i = 0; i < 2; i++) {
          const p = (t / 1500 + i * 0.5) % 1;
          const yy = Math.round(y + sp.oy - 2 - p * 7);
          const c = `rgba(255,255,255,${a * (1 - p)})`;
          px(kx + 10, yy, c);
          px(kx + 11, yy - 1, c);
          px(kx + 12, yy, c);
        }
      }

      // ── snug ──────────────────────────────────────────────────────────────
      // The answer to a low mood: the room draws in and warms up around her. Additive only, so
      // "sad" can never make her room look bleak.
      // Two rings of dither at the very edge of the frame, and nothing else. Enough to feel the room
      // close in, small enough that it never looks like a transparency grid.
      // A ring of warm floor around her and nothing else. The frame dither I tried first read as a
      // transparency grid, which is the single most dated-looking thing a canvas can do.
      if (sc.snug > 0.35) {
        for (const [dy, w] of [[2, 30], [3, 36], [4, 38], [5, 36], [6, 28]] as const) {
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
    };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{ display: "block", width: "100%", height: "100%", imageRendering: "pixelated" }}
    />
  );
}
