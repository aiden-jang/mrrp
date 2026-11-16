import { POSES } from "./sprites.js";

const LEFT = Math.max(...Object.values(POSES).map((pose) => -pose.ox));
const RIGHT = Math.max(...Object.values(POSES).map((pose) => pose.ox + pose.w));

export function boundCatTarget(x: number) {
  return Math.max(LEFT, Math.min(100 - RIGHT, x));
}

export function moveCat(current: number, target: number, elapsed: number, fast: boolean) {
  if (elapsed <= 0) return current;
  // Preserve the old 60 Hz pace while keeping travel independent of the display's refresh rate.
  const frames = Math.min(250, elapsed) / (1000 / 60);
  const next = current + (target - current) * (1 - (fast ? 0.6 : 0.95) ** frames);
  return Math.abs(target - next) <= 0.5 ? target : next;
}
