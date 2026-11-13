import { mixHex, type Scene } from "./hours.js";
import { contrast, standOff } from "./legible.js";

const MOOD_TINT: Record<string, string> = {
  good: "#f8e3b8",
  tired: "#e7ddd0",
  stressed: "#f2dcc9",
  sad: "#e4dfd4",
  lonely: "#f0dcd8",
  bored: "#e6e3d2",
  feral: "#f6dcc4",
  done: "#e3dcd2",
  horny: "#f2d4d6",
};

const DEEP = { air: "#232e26", warm: "#29372b", panel: "#303e32", line: "#52654e", honey: "#bdcba3" };
const DUSK = { air: "#2b382b", warm: "#344332", panel: "#3b4a37", line: "#63765b", honey: "#c3cda8" };
const DAWN = { air: "#e3e7dc", warm: "#ebedde", panel: "#f5f5e9", line: "#c5cdbb", honey: "#536746" };
const FULL = { air: "#e5e9de", warm: "#ebeee2", panel: "#f9f8ef", line: "#c6cfbf", honey: "#566c4c" };

const NIGHT_BELOW = 0.45;

const INK_ON_DARK = "#ebf1e2";
const SOFT_ON_DARK = "#b3c2ac";
const ERROR_ON_DARK = "#d39a88";

export function moodTint(id: string, night: boolean, panel: string): string {
  const day = MOOD_TINT[id];
  if (!day) return "var(--panel)";
  return night ? mixHex(day, panel, 0.8) : day;
}

export function isNightChrome(sun: number): boolean {
  return sun < NIGHT_BELOW;
}

export function chromeFor(scene: Scene): Record<string, string> {
  const night = isNightChrome(scene.sun);
  const t = night
    ? Math.min(1, scene.sun / NIGHT_BELOW)
    : Math.min(1, (scene.sun - NIGHT_BELOW) / (1 - NIGHT_BELOW));
  const from = night ? DEEP : DAWN;
  const to = night ? DUSK : FULL;
  const tint = (key: keyof typeof DEEP, hue: string) =>
    mixHex(mixHex(from[key], to[key], t), hue, night ? 0.06 : 0.1);
  const air = tint("air", scene.wallTop);
  const warm = tint("warm", scene.beamWarm);
  const panel = tint("panel", scene.wallTop);
  const ink = night ? INK_ON_DARK : "#2c4135";
  const readable = (color: string) => {
    for (let step = 0; step <= 20; step++) {
      const candidate = mixHex(color, ink, step / 20);
      if ([air, warm, panel].every((surface) => contrast(candidate, surface) >= 4.5)) return candidate;
    }
    return ink;
  };
  return {
    "--air": air,
    "--air-warm": warm,
    "--panel": panel,
    "--line": tint("line", scene.wallBottom),
    // A separator can be faint. The edge of something you press cannot: `--line` measured 1.38:1 on the
    // panel, so every pill in the room was text floating with a ghost around it.
    "--control": standOff(tint("panel", scene.wallTop)),
    "--honey": mixHex(from.honey, to.honey, t),
    "--ink": ink,
    "--on-honey": night ? "#263322" : "#fffdf4",
    "--soft": readable(night ? SOFT_ON_DARK : "#596b5d"),
    "--error": readable(night ? ERROR_ON_DARK : "#984a34"),
  };
}
