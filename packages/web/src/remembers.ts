import type { Milestone, Personality } from "./types.js";

/*
 * The risk is a readout. "Day 365. Favourite action: pet (48)" is a profile page, which is the opposite
 * of a cat, so no line shows a number that reads as a score.
 *
 * Nor can any of them imply something owed: "you have been doing this for a year" invites a reckoning,
 * "she has been here a year" is just true.
 */

/** No exclamation and no confetti word. The first week is the smallest of the three: it arrives while
 *  somebody is still deciding whether this is a thing they keep. */
export function milestoneLine(milestone: Milestone, catName: string): string {
  // A day he chose, so the room repeats his words rather than inventing an occasion it knows nothing
  // about. The cat not knowing what it means is the part that makes it hers to be present at.
  if (milestone.kind === "ours") {
    return `${milestone.label}, today. ${catName} has no idea what that means and is here for it anyway.`;
  }
  if (milestone.kind === "first-week")
    return `${catName} has been here a week. she has stopped checking the door.`;
  if (milestone.kind === "first-month")
    return `a month of ${catName}. she sleeps in the sun like she owns it.`;
  if (milestone.years === 1) return `${catName} has been here a year today. same cat, same window.`;
  return `${milestone.years} years of ${catName} today. she has not once thanked either of you.`;
}

/**
 * Two phrasings, like `ACTIONS`. `his`: the cat is "she", he is "you". `hers`: the cat is "you", he is
 * named. One neutral sentence would lose her half, where the cat has been paying attention on her behalf.
 */
const TRAIT_LINES: Record<Personality["trait"], { his: string; hers: (them: string) => string }> = {
  petted: {
    his: "she has learned that you are the one who stops to pet her.",
    hers: (them) => `you have learned that ${them} is the one who stops.`,
  },
  brushed: {
    his: "she sits down when she sees you coming, because you are the one with the brush.",
    hers: (them) => `you sit down when you see ${them} coming. you know what he has brought.`,
  },
  fed: {
    his: "she comes when she hears you, on the theory that you have brought something.",
    hers: (them) => `you come when you hear ${them}, on the theory that he has brought something.`,
  },
  accompanied: {
    his: "she has worked out that you are the one who just sits with her.",
    hers: (them) => `you have worked out that ${them} is the one who just sits.`,
  },
  photographed: {
    his: "she has stopped minding the camera. she knows it is you behind it.",
    hers: (them) => `you have stopped minding the camera. you know it is ${them} behind it.`,
  },
};

/**
 * The count never reaches the copy: "(48 times)" turns a cat into a dashboard, and the number is not the
 * interesting part. `them` is unnamed only between claiming a seat and typing a name.
 */
export function personalityLine(personality: Personality, youAreHer: boolean, them: string | null): string {
  const line = TRAIT_LINES[personality.trait];
  return youAreHer ? line.hers(them ?? "he") : line.his;
}

/* ------------------------------------------------------------------ coming back */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** A refresh is not a return, and a greeting on every reload is wallpaper. */
export const AWAY_FLOOR_MS = 8 * HOUR;

/**
 * Warmer with the gap, never sharper. Nothing here can be neglected, so a long absence reads as pleasure
 * at seeing you and never as an account of how long it has been. Null for a first visit or a refresh.
 */
export function awayLine(awayMs: number | null, catName: string): string | null {
  if (awayMs === null || awayMs < AWAY_FLOOR_MS) return null;
  if (awayMs < DAY) return `${catName} looks up. she was not expecting you until later.`;
  if (awayMs < 4 * DAY) return `${catName} is already on her way over.`;
  if (awayMs < 14 * DAY) return `${catName} takes a moment, and then decides it is definitely you.`;
  if (awayMs < 60 * DAY) return `${catName} has been keeping your spot warm. she will deny this.`;
  return `${catName} settles in like you never left, which is the whole trick of her.`;
}
