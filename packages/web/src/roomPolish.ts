import { mixHex, type Scene } from "./hours.js";
import type { Mood } from "./types.js";

type Paint = (x: number, y: number, width: number, height: number, color: string) => void;

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
