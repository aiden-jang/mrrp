import { mixHex } from "./hours.js";

const INK = "#4a3520";
const PALE = "#fff2d8";

/* Perceived brightness, the WCAG one, so `contrast` below means what it means everywhere else. */
export function relLum(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = relLum(a) >= relLum(b) ? [relLum(a), relLum(b)] : [relLum(b), relLum(a)];
  return (hi + 0.05) / (lo + 0.05);
}

// A colour that can be seen on the floor, whatever the floor is doing today. The marks his actions
// leave sit on it, and the floor is retinted every hour.
export function legible(floor: string, t = 0.82): string {
  const dark = mixHex(floor, INK, t);
  const light = mixHex(floor, PALE, t);
  return contrast(dark, floor) >= contrast(light, floor) ? dark : light;
}

// The nearest colour to `base` that still stands off it by `want`. `legible` jumps straight to 0.82
// because a mark may shout; this walks, because an outline may not.
export function standOff(base: string, want = 3): string {
  for (let t = 0.1; t <= 1; t += 0.05) {
    const dark = mixHex(base, INK, t);
    if (contrast(dark, base) >= want) return dark;
    const light = mixHex(base, PALE, t);
    if (contrast(light, base) >= want) return light;
  }
  return contrast(mixHex(base, INK, 1), base) >= contrast(mixHex(base, PALE, 1), base) ? INK : PALE;
}
