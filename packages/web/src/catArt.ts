import type { Cat as CatLook } from "./types.js";

export function catPalette(look: CatLook, awake: boolean, light: (color: string) => string) {
  const belly = light(look.belly);
  return {
    w: "#4a3520",
    f: light(look.fur),
    d: light(look.furDk),
    b: belly,
    p: "#e79ba3",
    n: "#e79ba3",
    m: "#4a3520",
    c: awake ? "#f0aeb4" : belly,
    h: awake ? "#fffdf6" : belly,
    e: awake ? look.eyes : belly,
  };
}
