import { mixHex, type Scene } from "./hours.js";
import { FRAME, FRAME_HOLE, type Sprite } from "./sprites.js";
import type { RoomDecor } from "./types.js";

export const DEFAULT_DECOR: RoomDecor = { palette: "oat", rug: "plain", art: "fish", mug: "cloud" };
export const ROOM_PALETTES = {
  oat: { label: "Oat", wall: "#f1dfc2", floor: "#c8b08d" },
  rose: { label: "Dusty rose", wall: "#ecd9d3", floor: "#c3a393" },
  moss: { label: "Moss", wall: "#dde3cd", floor: "#afb39a" },
  midnight: { label: "Midnight", wall: "#51475f", floor: "#75667d" },
};

export function decorateScene(scene: Scene, decor: RoomDecor): Scene {
  if (decor.palette === "oat") return scene;
  const palette = ROOM_PALETTES[decor.palette];
  const shade = scene.lightPhase === "night" ? 0.62 : scene.lightPhase === "evening" ? 0.34 : 0;
  const wall = mixHex(palette.wall, "#292337", shade);
  const floor = mixHex(palette.floor, "#292337", shade);
  return {
    ...scene,
    wallTop: wall,
    wallBottom: mixHex(wall, floor, 0.22),
    floorNear: floor,
    floorFar: mixHex(floor, wall, 0.15),
    litWall: mixHex(wall, scene.beamWarm, scene.sun * 0.18),
    patch: mixHex(floor, scene.beamWarm, scene.sun * 0.3),
  };
}

export function rugColors(scene: Scene, decor: RoomDecor) {
  if (decor.palette === "oat")
    return { edge: mixHex(scene.floorNear, "#765367", 0.58), body: mixHex(scene.floorNear, "#a8737e", 0.48) };
  const hue = decor.palette === "moss" ? "#87927b" : decor.palette === "midnight" ? "#a28fa9" : "#a8737e";
  return { edge: mixHex(scene.floorNear, hue, 0.7), body: mixHex(scene.floorNear, hue, 0.48) };
}

export function rugPattern(
  paint: (x: number, y: number, width: number, height: number, color: string) => void,
  decor: RoomDecor,
  body: string,
) {
  const thread = mixHex(body, "#fff2dc", 0.22);
  if (decor.rug === "stripe") for (const y of [63, 67, 71]) paint(37, y, 36, 1, thread);
  if (decor.rug === "check")
    for (let y = 63; y <= 71; y += 3)
      for (let x = 37; x <= 70; x += 3) if ((x + y) % 2 === 0) paint(x, y, 3, 3, thread);
}

export function mugColors(decor: RoomDecor) {
  if (decor.mug === "cloud") return { c: "#cfe0e4", d: "#a9c2c8" };
  const color = { cloud: "#cfe0e4", rose: "#dba6ae", ink: "#706079" }[decor.mug];
  return { c: color, d: mixHex(color, "#4a3520", 0.18) };
}

function print(pattern: string[]): Sprite {
  return {
    ...FRAME,
    rows: FRAME.rows.map((row, y) => {
      const inside = pattern[y - FRAME_HOLE.y];
      return inside ? row.slice(0, FRAME_HOLE.x) + inside + row.slice(FRAME_HOLE.x + FRAME_HOLE.w) : row;
    }),
  };
}

export const ROOM_ART = {
  fish: FRAME,
  moon: print([
    "hhhhhhhhhhhhhhh",
    "hhhhhhgghhhhhhh",
    "hhhhhggghhhhhhh",
    "hhhhgggghhhhhhh",
    "hhhhgggghhhhhhh",
    "hhhhggggghhhhhh",
    "hhhhhgggggghhhh",
    "hhhhhhhggghhhhh",
    "hhhhhhhhhhhhhhh",
  ]),
  flower: print([
    "hhhhhhhhhhhhhhh",
    "hhhhhhgghhhhhhh",
    "hhhhgggggghhhhh",
    "hhhhggwwgghhhhh",
    "hhhhhhgghhhhhhh",
    "hhhhhhwhhhhhhhh",
    "hhhhhgwhhhhhhhh",
    "hhhhhhwghhhhhhh",
    "hhhhhhhhhhhhhhh",
  ]),
};
