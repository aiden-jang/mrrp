import { mixHex, type Scene } from "./hours.js";
import { rugLight } from "./roomShell.js";
import type { Mood } from "./types.js";

type Paint = (x: number, y: number, width: number, height: number, color: string) => void;

export function rugSurface(paint: Paint, scene: Scene, body: string, edge: string) {
  paint(35, 61, 40, 13, body);
  rugLight(paint, scene, body);
  paint(36, 61, 38, 1, mixHex(body, scene.beamWarm, 0.12));
  paint(36, 73, 38, 1, mixHex(body, edge, 0.28));
  paint(35, 62, 1, 11, mixHex(body, edge, 0.18));
  paint(74, 62, 1, 11, mixHex(body, scene.beamWarm, 0.06));
  const thread = mixHex(body, scene.beamWarm, 0.09);
  const tuck = mixHex(body, edge, 0.12);
  for (const x of [39, 47, 55, 63, 71]) {
    paint(x, 66, 2, 1, thread);
    paint(x + 1, 68, 1, 1, tuck);
  }
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

export function companionCushion(paint: Paint, scene: Scene, here: boolean, depth: number) {
  const ink = "#4a3520";
  const edge = mixHex(scene.floorNear, "#796b82", 0.72);
  const cloth = mixHex(scene.floorNear, "#c1a6b8", 0.78);
  const dip = Math.round(depth * 2);
  paint(66, 73, 18, 1, mixHex(scene.floorNear, ink, 0.18));
  paint(64, 68, 22, 4, edge);
  paint(66, 65 + dip, 18, 7 - dip, edge);
  paint(66, 67 + dip, 18, 4 - dip, cloth);
  paint(68, 66 + dip, 14, 1, mixHex(cloth, scene.beamWarm, here ? 0.42 : 0.14));
  if (depth > 0.3) paint(70, 68 + dip, 10, 1, mixHex(cloth, ink, 0.23));
  paint(66, 70, 1, 1, mixHex(cloth, ink, 0.3));
  paint(83, 70, 1, 1, mixHex(cloth, ink, 0.3));
}
