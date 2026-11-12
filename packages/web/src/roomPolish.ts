import { mixHex, type Scene } from "./hours.js";
import { rugLight } from "./roomShell.js";
import type { Mood } from "./types.js";

type Paint = (x: number, y: number, width: number, height: number, color: string) => void;

export function rugSurface(paint: Paint, scene: Scene, body: string, edge: string) {
  const binding = mixHex(body, edge, 0.45);
  const inset = mixHex(body, edge, 0.15);
  paint(34, 60, 42, 15, binding);
  paint(32, 61, 46, 13, binding);
  paint(34.5, 60.5, 41, 14, inset);
  paint(32.5, 61.5, 45, 12, inset);
  paint(35, 61, 40, 13, body);
  rugLight(paint, scene, body);
  paint(35.5, 61, 39, 0.5, mixHex(body, scene.beamWarm, 0.08));
  paint(35.5, 73.5, 39, 0.5, mixHex(body, edge, 0.2));
  const thread = mixHex(body, scene.beamWarm, 0.12);
  for (const x of [37, 43, 49, 55, 61, 67, 73]) {
    paint(x, 61.5, 1, 0.5, thread);
    paint(x, 73, 1, 0.5, thread);
  }
  const weave = mixHex(body, scene.beamWarm, 0.06);
  for (const x of [39, 47, 55, 63, 71]) {
    paint(x, 66, 1.5, 0.5, weave);
    paint(x + 1, 68, 1, 0.5, mixHex(body, edge, 0.08));
  }
  for (const x of [35, 40, 69, 74]) paint(x, 75, 1, 0.5, binding);
}

export function shelfPalette(scene: Scene) {
  return {
    w: "#4a3520",
    d: "#8a6a48",
    f: mixHex("#8a6a48", scene.beamWarm, 0.18 + scene.sun * 0.12),
    c: mixHex("#8a6a48", "#4a3520", 0.34),
    b: "#c5a36c",
    p: "#aa7383",
    g: "#82917b",
    h: "#e9d5b5",
  };
}

export function mugPalette(glaze: { c: string; d: string }) {
  return {
    w: "#4a3520",
    ...glaze,
    b: mixHex(glaze.c, "#fff1cf", 0.16),
    h: mixHex(glaze.c, "#fffdf6", 0.32),
  };
}

export function bedPalette(palette: Record<string, string>) {
  return {
    ...palette,
    w: mixHex(palette.d!, "#4a3520", 0.28),
    h: mixHex(palette.f!, "#fff1cf", 0.14),
  };
}

export function windowPalette(scene: Scene, glass: string) {
  const wood = mixHex("#765136", scene.wallBottom, 0.12 + (1 - scene.sun) * 0.18);
  return {
    w: "#4a3520",
    b: mixHex(wood, scene.beamWarm, 0.08 + scene.sun * 0.14),
    f: wood,
    c: mixHex(wood, "#4a3520", 0.16),
    d: mixHex(wood, "#4a3520", 0.22),
    h: glass,
  };
}

export function facialMoment(time: number, mood: Mood | null) {
  const cycle = time % 5200;
  const sleepy = mood === "tired" || mood === "done";
  return {
    blink: (cycle > 3400 && cycle < (sleepy ? 3820 : 3520)) || (cycle > 4100 && cycle < 4200),
    wink: mood === "horny" && time % 11000 > 2600 && time % 11000 < 2980,
  };
}

export function cozyLight(paint: Paint, scene: Scene, x: number, floor: number) {
  if (scene.snug <= 0.35) return;
  const strength = 0.025 + scene.snug * 0.1;
  const tint = (alpha: number) => `rgba(244,197,133,${alpha.toFixed(3)})`;
  for (let row = 0; row < 9; row++) {
    const distance = Math.abs(row - 4) / 4;
    const width = 27 - Math.round(distance * distance * 13);
    const alpha = strength * (1 - distance * 0.65);
    const y = floor + 0.5 + row * 0.5;
    paint(x - width / 2, y, width, 0.5, tint(alpha * 0.35));
    paint(x - width / 2 + 1, y, width - 2, 0.5, tint(alpha * 0.65));
  }
}

export function companionCushion(paint: Paint, scene: Scene, here: boolean, depth: number) {
  const ink = "#4a3520";
  const cloth = mixHex(scene.floorNear, "#c1a6b8", 0.78);
  const edge = mixHex(cloth, "#65515f", 0.22);
  const dip = Math.round(depth * 4) / 2;
  const top = 65 + dip;
  paint(65, 73, 20, 1, mixHex(scene.floorNear, ink, 0.08));
  paint(67, 72.5, 16, 0.5, mixHex(scene.floorNear, ink, 0.13));
  paint(66, top, 18, 7.5 - dip, edge);
  paint(65, top + 0.5, 20, 6.5 - dip, edge);
  paint(64.5, top + 1.5, 21, 4.5 - dip, edge);
  paint(66, top + 0.5, 18, 6.5 - dip, cloth);
  paint(65.5, top + 1, 19, 5.5 - dip, cloth);
  paint(65, top + 2, 20, 3.5 - dip, cloth);
  paint(66, 70.5, 18, 1.5, mixHex(cloth, ink, 0.08));
  paint(68, top + 0.5, 14, 0.5, mixHex(cloth, scene.beamWarm, here ? 0.16 : 0.08));
  if (depth > 0) {
    const dent = mixHex(cloth, ink, depth * 0.12);
    paint(70, top + 1.5, 10, 0.5, dent);
    paint(71, top + 2, 8, 0.5, dent);
  }
  paint(66.5, 71, 17, 0.5, mixHex(cloth, ink, 0.12));
  const thread = mixHex(cloth, scene.beamWarm, 0.12);
  for (const x of [67, 72, 78, 83]) paint(x, 71, 0.5, 0.5, thread);
}
