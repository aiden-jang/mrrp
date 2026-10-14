import { mixHex, type Scene } from "./hours.js";
import { standOff } from "./legible.js";

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

const DEEP = { air: "#211e1a", warm: "#2b251f", panel: "#302a23", line: "#55493c", honey: "#e8ad55" };
const DUSK = { air: "#352e26", warm: "#40362c", panel: "#463b30", line: "#6b5947", honey: "#e2a349" };
const DAWN = { air: "#f4e9db", warm: "#fbf1e4", panel: "#fbf5ea", line: "#ded0b8", honey: "#d9963a" };
const FULL = { air: "#f7ecdc", warm: "#fdf6ea", panel: "#fffaf0", line: "#e6d5bb", honey: "#e0a03f" };

const NIGHT_BELOW = 0.45;

const INK_ON_DARK = "#f6f1e6";
const SOFT_ON_DARK = "#d0c1ad";
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
  return {
    "--air": tint("air", scene.wallTop),
    "--air-warm": tint("warm", scene.beamWarm),
    "--panel": tint("panel", scene.wallTop),
    "--line": tint("line", scene.wallBottom),
    // A separator can be faint. The edge of something you press cannot: `--line` measured 1.38:1 on the
    // panel, so every pill in the room was text floating with a ghost around it.
    "--control": standOff(tint("panel", scene.wallTop)),
    "--honey": mixHex(from.honey, to.honey, t),
    "--ink": night ? INK_ON_DARK : "#3f2f1f",
    "--soft": night ? SOFT_ON_DARK : "#77634a",
    "--error": night ? ERROR_ON_DARK : "#a4563d",
  };
}
