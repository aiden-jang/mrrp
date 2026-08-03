import { useEffect, useRef } from "react";
import type { Cat as CatLook } from "./types.js";

/**
 * The room, drawn on canvas. Warm light from an off-screen window, dust in the beam, and her asleep
 * in the sunbeam. She wakes a little when your cursor comes near and purrs while you hold on her.
 */
export function Cat({
  look,
  petting,
  nudge,
}: {
  look: CatLook;
  petting: boolean;
  /** Bumped whenever an action happens, so she reacts to it. */
  nudge: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const petRef = useRef(petting);
  const lookRef = useRef(look);
  petRef.current = petting;
  lookRef.current = look;

  const near = useRef(0);
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

      // room
      const wall = g.createLinearGradient(0, 0, 0, FLOOR);
      wall.addColorStop(0, "#efdcc2"); wall.addColorStop(1, "#e4cdae");
      g.fillStyle = wall; g.fillRect(0, 0, W, FLOOR);
      const fl = g.createLinearGradient(0, FLOOR, 0, H);
      fl.addColorStop(0, "#d3b48d"); fl.addColorStop(1, "#e3caa8");
      g.fillStyle = fl; g.fillRect(0, FLOOR, W, H - FLOOR);
      g.fillStyle = "rgba(255,255,255,.34)"; g.fillRect(0, FLOOR - 7, W, 7);

      // light from an unseen window
      g.save();
      g.beginPath();
      g.moveTo(W * .44, 0); g.lineTo(W * 1.02, 0); g.lineTo(W * 1.02, H); g.lineTo(W * .1, H);
      g.closePath(); g.clip();
      const beam = g.createLinearGradient(W * .9, 0, W * .2, H);
      beam.addColorStop(0, "rgba(255,240,201,.9)");
      beam.addColorStop(.55, "rgba(255,236,190,.4)");
      beam.addColorStop(1, "rgba(255,232,184,.04)");
      g.fillStyle = beam; g.fillRect(0, 0, W, H);
      g.fillStyle = "rgba(196,158,110,.15)";
      g.save(); g.translate(W * .62, H * .52); g.rotate(-.42);
      g.fillRect(-260, -6, 520, 11); g.fillRect(-6, -260, 12, 520); g.restore();
      g.restore();

      ell(W * .55, FLOOR + 74, 200, 60, "rgba(255,238,193,.7)");
      ell(W * .55, FLOOR + 74, 146, 42, "rgba(255,245,214,.58)");

      if (!reduce) for (const m of motes) {
        m.y -= m.s; m.w += .012;
        if (m.y < -4) { m.y = H + 4; m.x = 150 + Math.random() * 320; }
        g.beginPath(); g.arc(m.x + Math.sin(m.w) * 9, m.y, m.r, 0, 6.28);
        g.fillStyle = "rgba(255,251,232,.4)"; g.fill();
      }

      // how close you are, eased so she never twitches
      const kx = W * .53, ky = FLOOR + 56;
      const want = ptr.in ? Math.max(0, 1 - Math.hypot(ptr.x - kx, ptr.y - ky) / 210) : 0;
      near.current += (want - near.current) * .07;
      const n = near.current;
      const pet = petRef.current;
      bounce.current = Math.max(0, bounce.current - .02);

      const breathe = reduce ? 0 : Math.sin(t / 1000) * 1.6;
      const purr = pet && !reduce ? Math.sin(t / 34) * .8 : 0;
      const lift = bounce.current * 5;

      g.save();
      g.translate(kx + n * 6 + purr, ky + breathe - lift);

      ell(4, 34, 72, 15, "rgba(176,132,84,.28)");

      // tail curled round the front
      g.strokeStyle = L.furDk; g.lineWidth = 15; g.lineCap = "round";
      const wag = reduce ? 0 : Math.sin(t / (pet ? 900 : 620)) * (4 + n * 9);
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

      // eyes: shut while dozing or being petted, open a crack when you come near
      const open = pet ? 0 : n;
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
      if (pet) {
        g.strokeStyle = "rgba(224,160,63,.4)"; g.lineWidth = 2;
        for (let i = 0; i < 2; i++) {
          const p = ((t / 1000 + i * .5) % 1);
          g.beginPath(); g.arc(kx + 32, ky - 52, 6 + p * 22, -1.1, .5); g.stroke();
        }
      }

      const glow = g.createRadialGradient(W * .82, H * .1, 20, W * .82, H * .1, W * .95);
      glow.addColorStop(0, "rgba(255,236,186,.3)"); glow.addColorStop(1, "rgba(255,236,186,0)");
      g.fillStyle = glow; g.fillRect(0, 0, W, H);
      const vig = g.createRadialGradient(W / 2, H / 2, H * .34, W / 2, H / 2, H * .92);
      vig.addColorStop(0, "rgba(120,84,44,0)"); vig.addColorStop(1, "rgba(120,84,44,.12)");
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
