import { mixHex, type Scene } from "./hours.js";

type Paint = (x: number, y: number, width: number, height: number, color: string) => void;
const INK = "#4a3520";

export function shell(paint: Paint, scene: Scene) {
  paint(0, 0, 100, 48, scene.wallTop);
  paint(0, 39, 100, 9, mixHex(scene.wallBottom, "#896c57", 0.14));
  paint(87, 0, 13, 48, mixHex(scene.wallTop, "#4c465b", 0.2));
  paint(86.5, 0, 0.5, 48, mixHex(scene.wallTop, scene.beamWarm, 0.16));
  paint(87, 39, 13, 9, mixHex(scene.wallBottom, "#4c465b", 0.26));
  paint(0, 39, 100, 0.5, mixHex(scene.wallBottom, scene.beamWarm, 0.23));
  for (const x of [4, 25, 46, 67, 87]) {
    paint(x, 40, 0.5, 7, mixHex(scene.wallBottom, INK, 0.1));
    paint(x + 0.5, 40, 0.5, 7, mixHex(scene.wallBottom, scene.beamWarm, 0.08));
  }
  paint(0, 47, 100, 1, mixHex(scene.wallBottom, INK, 0.22));
  paint(0, 47, 100, 0.5, mixHex(scene.wallBottom, scene.beamWarm, 0.28));
  paint(0, 48, 100, 32, scene.floorNear);
  paint(0, 48, 100, 6, mixHex(scene.floorFar, INK, 0.08));
  paint(0, 48, 100, 0.5, mixHex(scene.floorFar, INK, 0.2));
  const plaster = mixHex(scene.wallTop, scene.wallBottom, 0.14);
  for (const [x, y, width] of [
    [8, 9, 3],
    [38, 5, 2],
    [41, 30, 4],
    [19, 32, 2],
    [80, 7, 3],
  ] as const) {
    paint(x, y, width, 0.5, plaster);
    paint(x + 1, y + 0.5, width - 1, 0.5, plaster);
  }
}

export function floor(paint: Paint, scene: Scene) {
  const seam = mixHex(scene.floorFar, INK, 0.22);
  const edge = mixHex(scene.floorNear, scene.beamWarm, 0.14);
  const bands = [48, 51, 55, 61, 69, 79, 80];
  for (let band = 1; band < bands.length - 1; band++) {
    const y = bands[band]!;
    paint(0, y, 100, 0.5, seam);
    paint(0, y + 0.5, 100, 0.5, edge);
  }
  for (let band = 0; band < bands.length - 1; band++) {
    for (let y = bands[band]!; y < bands[band + 1]!; y += 0.5) {
      const depth = 0.62 + ((y - 48) / 32) * 0.55;
      for (const joint of [-15, 13, 41, 69, 97, 125]) {
        const x = Math.round((50 + (joint + (band % 2) * 14 - 50) * depth) * 2) / 2;
        paint(x, y, 0.5, 0.5, seam);
        paint(x + 0.5, y, 0.5, 0.5, mixHex(scene.floorNear, scene.beamWarm, 0.06));
      }
    }
  }
  const grain = mixHex(scene.floorNear, INK, 0.07);
  for (const [x, y, width] of [
    [7, 53, 4],
    [35, 57, 6],
    [70, 58, 5],
    [13, 65, 7],
    [57, 66, 5],
    [86, 73, 8],
    [22, 75, 7],
    [46, 77, 5],
  ] as const) {
    paint(x, y, width, 0.5, grain);
    paint(x + 1, y + 0.5, Math.max(1, width - 3), 0.5, grain);
  }
}

export function joinery(paint: Paint, scene: Scene) {
  const seam = mixHex(scene.wallBottom, INK, 0.12);
  for (const x of [4, 25, 46, 67, 87]) paint(x, 40, 0.5, 7, seam);
  paint(0, 39, 100, 0.5, mixHex(scene.wallBottom, scene.beamWarm, 0.28));
  paint(0, 47, 100, 1, mixHex(scene.wallBottom, INK, 0.22));
  paint(0, 47, 100, 0.5, mixHex(scene.wallBottom, scene.beamWarm, 0.24));
}

export function lampGlow(paint: Paint, scene: Scene) {
  for (let radius = 10; radius >= 2; radius -= 2) {
    paint(
      89 - radius,
      22 - radius * 0.6,
      radius * 2,
      radius * 1.2,
      mixHex(scene.wallBottom, "#dca261", 0.04 + (10 - radius) * 0.018),
    );
  }
}

export const poolScale = (scene: Scene) =>
  scene.lightPhase === "golden" ? 1.14 : scene.lightPhase === "dawn" ? 0.72 : 1;

export function sunlight(paint: Paint, scene: Scene, beam: number, window: number, dull: boolean) {
  const night = scene.lightPhase === "night";
  const strength = night ? 0.06 : dull ? 0.18 : scene.lightPhase === "golden" ? 0.76 : 0.46;
  const lit = mixHex(scene.wallTop, scene.beamWarm, strength);
  const softened = mixHex(scene.wallTop, lit, 0.5);
  for (let y = 20.5; y < 48; y += 0.5) {
    const progress = (y - 20.5) / 27.5;
    const center = window + (beam - window) * progress;
    const width = 23 + progress * 3;
    const left = Math.round((center - width / 2) * 2) / 2;
    paint(left, y, width, 0.5, lit);
    paint(left, y, 0.5, 0.5, softened);
    paint(left + width - 0.5, y, 0.5, 0.5, softened);
    paint(Math.round(center * 2) / 2, y, 0.5, 0.5, mixHex(lit, scene.wallTop, 0.4));
  }
  for (let y = 48; y < 71; y += 0.5) {
    const progress = (y - 48) / 23;
    const center = beam + (beam - window) * progress * 0.14;
    const width = (26 + progress * 12) * poolScale(scene);
    const amount = night ? 0.07 : dull ? 0.12 : scene.sun * (0.58 - progress * 0.14);
    const floor = mixHex(scene.floorNear, scene.beamWarm, amount);
    paint(Math.round((center - width / 2) * 2) / 2, y, width, 0.5, floor);
    paint(Math.round(center * 2) / 2, y, 0.5 + progress, 0.5, mixHex(floor, scene.floorNear, 0.38));
  }
  if (night) {
    for (let row = 0; row < 6; row++) {
      const width = 20 - row * 2;
      paint(86 - width / 2, 48 + row, width, 1, mixHex(scene.floorNear, "#df9d59", 0.22 - row * 0.025));
    }
  }
}

export function rugLight(paint: Paint, scene: Scene, body: string) {
  if (scene.sun < 0.15) return;
  const beam = scene.beam * 100;
  for (let y = 61; y < 74; y += 0.5) {
    const half = ((26 + ((y - 48) / 23) * 12) * poolScale(scene)) / 2;
    const left = Math.max(35, Math.round((beam - half) * 2) / 2);
    const right = Math.min(75, Math.round((beam + half) * 2) / 2);
    if (right > left) paint(left, y, right - left, 0.5, mixHex(body, scene.beamWarm, scene.sun * 0.22));
  }
}

export function curtains(paint: Paint, scene: Scene, x: number, hem: number) {
  const cloth = mixHex(scene.wallBottom, "#927585", 0.72);
  const shadow = mixHex(cloth, "#4c4053", 0.3);
  const fold = mixHex(cloth, scene.beamWarm, 0.15 + scene.sun * 0.12);
  const casing = mixHex("#806044", scene.wallBottom, 0.18);
  paint(x - 1, 3, 19, 13, mixHex(scene.wallBottom, INK, 0.22));
  paint(x - 5, 2, 27, 1 / 3, INK);
  paint(x - 5.5, 5 / 3, 2 / 3, 1, casing);
  paint(x + 21.5, 5 / 3, 2 / 3, 1, casing);
  for (const left of [x - 5, x + 17]) {
    paint(left, 3, 5, 22, cloth);
    paint(left, 3, 1 / 3, 21, shadow);
    paint(left + 1, 3, 2 / 3, 21, fold);
    paint(left + 3, 3, 1 / 3, 22, shadow);
    paint(left + 4, 3, 1 / 3, 21, fold);
    paint(left + 1 / 3, 25, 4, 1 / 3, shadow);
    paint(left + 1 + hem / 3, 25 + 1 / 3, 1, 1 / 3, cloth);
    paint(left + 3 - hem / 3, 25 + 1 / 3, 1, 1 / 3, cloth);
    paint(left, 13, 5, 1 / 3, mixHex(cloth, "#d2ad74", 0.45));
  }
  paint(x - 1, 15, 19, 1, casing);
  paint(x - 2, 16, 21, 1 / 3, mixHex(casing, scene.beamWarm, 0.3));
}

export function hangingPlant(paint: Paint, scene: Scene, x: number, seasonal: string) {
  const leaf = mixHex(seasonal, "#6e865f", 0.72);
  const light = mixHex(leaf, scene.beamWarm, 0.2);
  const dark = mixHex(leaf, "#3b4e38", 0.3);
  paint(49, 4, 0.5, 6, INK);
  paint(x - 2, 8, 0.5, 5, "#806044");
  paint(x + 2, 8, 0.5, 5, "#806044");
  paint(x - 3, 12, 6, 3, "#a9754e");
  paint(x - 2.5, 12, 5, 0.5, "#d6aa77");
  paint(x - 2, 15, 4, 1, "#6e4c38");
  for (const [dx, dy, width] of [
    [-6, -1, 4],
    [-3, -4, 5],
    [1, -5, 4],
    [3, -2, 5],
    [-5, 2, 4],
    [2, 1, 5],
    [-6, 6, 3],
    [3, 5, 4],
    [-5, 10, 3],
  ] as const) {
    paint(x + dx + 0.5, 11 + dy, width - 1, 0.5, leaf);
    paint(x + dx, 11.5 + dy, width, 1, leaf);
    paint(x + dx + 0.5, 12.5 + dy, width - 1, 0.5, dark);
    paint(x + dx + 1, 11.5 + dy, 1, 0.5, light);
  }
  paint(x - 4, 13, 0.5, 9, dark);
  paint(x + 4, 12, 0.5, 6, dark);
}

export function plantPalette(scene: Scene, seasonal: string) {
  const leaf = mixHex(seasonal, "#6f865f", 0.72);
  return {
    g: leaf,
    l: mixHex(leaf, scene.beamWarm, 0.2),
    s: mixHex(leaf, "#344332", 0.3),
    d: "#ad774f",
    f: "#d3a16f",
    c: "#79513b",
    w: INK,
  };
}
