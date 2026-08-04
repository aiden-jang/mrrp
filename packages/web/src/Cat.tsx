import { useEffect, useRef } from "react";
import type { Cat as CatLook, Clock, Mood } from "./types.js";
import { sceneFor } from "./hours.js";

/**
 * The room, drawn on canvas, at whatever time of day it is where SHE is.
 *
 * The light, the palette and where she's lying all come from her local hour: first sun by the window
 * in the morning, dead asleep in the best patch mid-afternoon, by the door around the time you're
 * usually home, curled up small at night. She wakes a little when your cursor comes near and purrs
 * while you hold on her.
 */
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
    const W = 500, H = 400, FLOOR = H * 0.6;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const fit = () => {
      const d = Math.min(2, devicePixelRatio || 1);
      cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(cv);

    const ptr = { x: W / 2, y: FLOOR + 40, in: false };
    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      ptr.x = ((e.clientX - r.left) / r.width) * W;
      ptr.y = ((e.clientY - r.top) / r.height) * H;
      ptr.in = true;
    };
    const onLeave = () => { ptr.in = false; };
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerleave", onLeave);

    const motes = Array.from({ length: 24 }, () => ({
      x: 150 + Math.random() * 320, y: Math.random() * H,
      r: 0.7 + Math.random() * 1.4, s: 0.05 + Math.random() * 0.12, w: Math.random() * 6.28,
    }));

    const ell = (x: number, y: number, rx: number, ry: number, c: string, rot = 0) => {
      g.save(); g.translate(x, y); g.rotate(rot);
      g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, 6.2832); g.fillStyle = c; g.fill(); g.restore();
    };

    let raf = 0;
    const frame = (t: number) => {
      const L = lookRef.current;
      const sc = sceneFor(clockRef.current, Date.now(), moodRef.current);
      const bx = W * sc.beam;

      // room, coloured for her time of day
      const wall = g.createLinearGradient(0, 0, 0, FLOOR);
      wall.addColorStop(0, sc.wallTop); wall.addColorStop(1, sc.wallBottom);
      g.fillStyle = wall; g.fillRect(0, 0, W, FLOOR);
      const fl = g.createLinearGradient(0, FLOOR, 0, H);
      fl.addColorStop(0, sc.floorFar); fl.addColorStop(1, sc.floorNear);
      g.fillStyle = fl; g.fillRect(0, FLOOR, W, H - FLOOR);
      g.fillStyle = `rgba(255,255,255,${.1 + sc.sun * .26})`; g.fillRect(0, FLOOR - 7, W, 7);

      // the door she waits at, on the near wall
      g.fillStyle = "rgba(112,78,48,.22)"; g.fillRect(W * .04, FLOOR - 132, 74, 132);
      g.fillStyle = "rgba(92,62,38,.3)"; g.fillRect(W * .04, FLOOR - 132, 74, 5);
      g.beginPath(); g.arc(W * .04 + 62, FLOOR - 66, 3.4, 0, 6.28);
      g.fillStyle = "rgba(255,236,186,.55)"; g.fill();

      // light from an unseen window, tracking across the room over the day
      g.save();
      g.beginPath();
      g.moveTo(bx - W * .12, 0); g.lineTo(bx + W * .46, 0);
      g.lineTo(bx + W * .3, H); g.lineTo(bx - W * .42, H);
      g.closePath(); g.clip();
      const beam = g.createLinearGradient(bx + W * .34, 0, bx - W * .3, H);
      beam.addColorStop(0, `rgba(255,240,201,${.28 + sc.sun * .62})`);
      beam.addColorStop(.55, `rgba(255,236,190,${.1 + sc.sun * .3})`);
      beam.addColorStop(1, "rgba(255,232,184,.03)");
      g.fillStyle = beam; g.fillRect(0, 0, W, H);
      g.fillStyle = `rgba(196,158,110,${.05 + sc.sun * .12})`;
      g.save(); g.translate(bx + W * .06, H * .52); g.rotate(-.42);
      g.fillRect(-260, -6, 520, 11); g.fillRect(-6, -260, 12, 520); g.restore();
      g.restore();

      // the patch on the floor, which is the spot she is always trying to be in
      ell(bx, FLOOR + 74, 200, 60, `rgba(255,238,193,${sc.sun * .7})`);
      ell(bx, FLOOR + 74, 146, 42, `rgba(255,245,214,${sc.sun * .58})`);

      if (!reduce) for (const m of motes) {
        m.y -= m.s; m.w += .012;
        if (m.y < -4) { m.y = H + 4; m.x = 150 + Math.random() * 320; }
        g.beginPath(); g.arc(m.x + Math.sin(m.w) * 9, m.y, m.r, 0, 6.28);
        // Dust is only visible in the beam, so it has to fade with the light. Left bright after dark
        // it reads as a starfield, which is a lovely effect in the wrong room.
        g.fillStyle = `rgba(255,251,232,${.06 + sc.sun * .34})`; g.fill();
      }

      // where she is, eased so she drifts across the room rather than teleporting between hours
      const wantX = W * sc.catX;
      if (catX.current === null) catX.current = wantX;
      catX.current += (wantX - catX.current) * .015;

      // how close you are, eased so she never twitches
      const kx = catX.current, ky = FLOOR + 56;
      const want = ptr.in ? Math.max(0, 1 - Math.hypot(ptr.x - kx, ptr.y - ky) / 210) : 0;
      near.current += (want - near.current) * .07;
      const n = near.current;
      const pet = petRef.current;
      bounce.current = Math.max(0, bounce.current - .02);

      const breathe = reduce ? 0 : Math.sin(t / 1000) * 1.6;
      const purr = (pet || sc.purring) && !reduce ? Math.sin(t / 34) * (pet ? .8 : .45) : 0;
      const lift = bounce.current * 5;

      g.save();
      g.translate(kx + n * 6 + purr, ky + breathe - lift);

      ell(4, 34, 72, 15, "rgba(176,132,84,.28)");

      // tail curled round the front
      g.strokeStyle = L.furDk; g.lineWidth = 15; g.lineCap = "round";
      const wag = reduce ? 0 : Math.sin(t / (pet ? 900 : 620 - sc.play * 380)) * (4 + n * 9 + sc.play * 11);
      g.beginPath(); g.moveTo(48, 22);
      g.quadraticCurveTo(94, 30 + wag, 64, 52 + wag * .5); g.stroke();

      ell(0, 12, 66, 43, L.fur);
      ell(-6, 22, 50, 29, L.belly);
      ell(-30, 34, 25, 11, L.belly);
      ell(-4, 36, 23, 10, L.belly);

      if (L.tabby) {
        g.save(); g.globalAlpha = .26; g.fillStyle = L.furDk;
        for (const sx of [-24, -6, 12]) { g.fillRect(sx, -20, 7, 21); }
        g.restore();
      }

      // head
      g.save();
      g.translate(-18, -30);
      g.rotate(n * .14 + (pet ? .2 : 0));

      g.fillStyle = L.fur;
      g.beginPath(); g.moveTo(-34, -14); g.lineTo(-20, -40); g.lineTo(-4, -18); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(12, -20); g.lineTo(30, -40); g.lineTo(36, -12); g.closePath(); g.fill();
      g.fillStyle = "#eaa1a1";
      g.beginPath(); g.moveTo(-27, -17); g.lineTo(-20, -32); g.lineTo(-11, -19); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(16, -20); g.lineTo(27, -32); g.lineTo(30, -15); g.closePath(); g.fill();

      ell(0, 0, 40, 34, L.fur);
      ell(0, 10, 30, 22, L.belly);
      ell(-13, 14, 12, 9, L.belly);
      ell(13, 14, 12, 9, L.belly);

      // eyes: shut while dozing or being petted, open a crack when you come near. Mid-afternoon she
      // is not being woken by a cursor, and when she's at the door she's already wide awake.
      const open = pet ? 0 : Math.max(n * (1 - sc.sleepy), sc.atDoor ? .85 : 0, sc.eyes);
      g.strokeStyle = "#3f2f1f"; g.lineWidth = 3; g.lineCap = "round";
      for (const ex of [-15, 15]) {
        if (open < .3) {
          g.beginPath(); g.moveTo(ex - 8, 1); g.quadraticCurveTo(ex, 7, ex + 8, 1); g.stroke();
        } else {
          ell(ex, 1, 6.2, 4 + open * 4.5, L.eyes);
          ell(ex, 1, 2.6, 4 + open * 4, "#2a1f14");
          g.beginPath(); g.arc(ex + 2.4, -1.6, 1.8, 0, 6.28);
          g.fillStyle = "rgba(255,255,255,.9)"; g.fill();
        }
      }

      g.fillStyle = "#eaa1a1";
      g.beginPath(); g.moveTo(-4.5, 8); g.lineTo(4.5, 8); g.lineTo(0, 13); g.closePath(); g.fill();
      g.strokeStyle = "#8a7256"; g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, 13); g.quadraticCurveTo(-5, 18, -9, 14);
      g.moveTo(0, 13); g.quadraticCurveTo(5, 18, 9, 14); g.stroke();

      g.strokeStyle = "rgba(138,114,86,.4)"; g.lineWidth = 1.4;
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(s * 14, 10); g.quadraticCurveTo(s * 34, 6, s * 44, 8);
        g.moveTo(s * 14, 13); g.quadraticCurveTo(s * 34, 14, s * 45, 17); g.stroke();
      }
      g.restore();
      g.restore();

      // purr, shown rather than written
      if (pet || sc.purring) {
        g.strokeStyle = "rgba(224,160,63,.4)"; g.lineWidth = 2;
        for (let i = 0; i < 2; i++) {
          const p = ((t / 1000 + i * .5) % 1);
          g.strokeStyle = `rgba(224,160,63,${pet ? .4 : .24})`;
          g.beginPath(); g.arc(kx + 32, ky - 52, 6 + p * 22, -1.1, .5); g.stroke();
        }
      }

      // Snug is the answer to a low mood: the room draws in and warms up. Deliberately additive
      // light, never a darkening pass, so "sad" can never make her room look bleak.
      if (sc.snug > 0) {
        const warm = g.createRadialGradient(kx, ky - 10, 10, kx, ky - 10, H * .95);
        warm.addColorStop(0, `rgba(255,214,150,${sc.snug * .3})`);
        warm.addColorStop(1, "rgba(255,214,150,0)");
        g.fillStyle = warm; g.fillRect(0, 0, W, H);
      }

      const gx = bx + W * .28;
      const glow = g.createRadialGradient(gx, H * .1, 20, gx, H * .1, W * .95);
      glow.addColorStop(0, `rgba(255,236,186,${.08 + sc.sun * .26})`); glow.addColorStop(1, "rgba(255,236,186,0)");
      g.fillStyle = glow; g.fillRect(0, 0, W, H);
      const vig = g.createRadialGradient(kx, ky - 20, H * (.34 - sc.snug * .16), kx, ky - 20, H * .92);
      vig.addColorStop(0, "rgba(120,84,44,0)");
      vig.addColorStop(1, `rgba(120,84,44,${.12 + sc.snug * .16})`);
      g.fillStyle = vig; g.fillRect(0, 0, W, H);

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={ref} style={{ display: "block", width: "100%", height: "100%" }} />;
}
