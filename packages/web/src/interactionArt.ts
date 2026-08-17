export const INTERACTION_ART = {
  leaf: "/art/interactions/leaf.png",
  cap: "/art/interactions/cap.png",
  moth: "/art/interactions/moth.png",
  cake: "/art/interactions/cake.png",
  yarn: "/art/interactions/yarn.png",
  treat: "/art/interactions/treat.png",
  catnip: "/art/interactions/catnip.png",
  mouse: "/art/interactions/mouse.png",
  bubble: "/art/interactions/bubble.png",
  piano: "/art/interactions/piano.png",
  shootingStar: "/art/interactions/shooting-star.png",
  constellation: "/art/interactions/constellation.png",
  rainbow: "/art/interactions/rainbow.png",
  aurora: "/art/interactions/aurora.png",
  windowLight: "/art/interactions/window-light.png",
  note: "/art/interactions/note.png",
  bird: "/art/interactions/bird.png",
  steam: "/art/interactions/steam.png",
  sparkles: "/art/interactions/sparkles.png",
  bloom: "/art/interactions/bloom.png",
} as const;

/** The source sheet is clean RGB-on-black; screen blending makes black contribute no light. */
export const INTERACTION_BLEND_MODE = "screen" as const;
