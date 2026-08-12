import type { Milestone, Personality } from "./types.js";

/*
 * What the room says about how long it has been going, and about who she has turned into.
 *
 * The whole risk with both of these is that they come out as a readout. "Day 365. Favourite action: pet
 * (48)." is a profile page, and a profile page is the opposite of a cat. So neither line ever shows a
 * number that reads as a score, and both are written the way the room talks about everything else:
 * flatly, about the cat, without congratulating anybody for turning up.
 *
 * The other rule is that neither line can imply anything owed. "You have been doing this for a year"
 * invites a reckoning about whether you did it enough. "She has been here a year" is just true.
 */

/**
 * A day worth mentioning, in the room's voice.
 *
 * Deliberately no exclamation, no confetti word, and nothing that names the day as an achievement. The
 * first week is the smallest of the three because it is the one most likely to arrive while somebody is
 * still deciding whether this is a thing they keep, and a big noise then would answer that question
 * badly.
 *
 * Needs no second phrasing: the cat has a name, and both seats call her by it.
 */
export function milestoneLine(milestone: Milestone, catName: string): string {
  if (milestone.kind === "first-week") return `${catName} has been here a week. she has stopped checking the door.`;
  if (milestone.kind === "first-month") return `a month of ${catName}. she sleeps in the sun like she owns it.`;
  if (milestone.years === 1) return `${catName} has been here a year today. same cat, same window.`;
  return `${milestone.years} years of ${catName} today. she has not once thanked either of you.`;
}

/**
 * Two phrasings again, for the same reason `ACTIONS` has them.
 *
 *   `his` is read by the one who turns up: the cat is "she", and he is "you".
 *   `hers` is read by the one the cat is: the cat is "you", and he is named.
 *
 * Her half is the better one, and it is why this is worth two strings rather than one neutral sentence.
 * He learns what the cat expects of him; she learns that the cat has been paying attention to somebody
 * on her behalf.
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
 * Who she has become, or nothing.
 *
 * The count never reaches the copy. It stays on the type so this can be honest about the threshold if it
 * ever needs to be, but a sentence with "(48 times)" in it turns a cat into a dashboard, and the number
 * is not the interesting part: the interesting part is that she now expects it.
 *
 * `them` is only unnamed in the window between him claiming a seat and typing a name, and "he" is a
 * truthful stand-in there rather than a blank or a placeholder name.
 */
export function personalityLine(personality: Personality, youAreHer: boolean, them: string | null): string {
  const line = TRAIT_LINES[personality.trait];
  return youAreHer ? line.hers(them ?? "he") : line.his;
}

/* ------------------------------------------------------------------ coming back */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/**
 * Nothing at all until somebody has genuinely been gone.
 *
 * A refresh is not a return. Below this the room says nothing, which is what makes the greeting mean
 * something on the days it does appear.
 */
export const AWAY_FLOOR_MS = 8 * HOUR;

/**
 * What the room says when you come back.
 *
 * The whole rule for this app is that nothing here can be neglected: no streak, no decay, nothing that
 * can be fallen behind on. So a long absence has to read as pleasure at seeing you, never as an account
 * of how long it has been. "Where have you been" is the one sentence this room must never say, and the
 * longer the gap the warmer this gets rather than the more pointed.
 *
 * Null for a first visit, for a refresh, and for anything the room has no opinion about.
 */
export function awayLine(awayMs: number | null, catName: string): string | null {
  if (awayMs === null || awayMs < AWAY_FLOOR_MS) return null;
  if (awayMs < DAY) return `${catName} looks up. she was not expecting you until later.`;
  if (awayMs < 4 * DAY) return `${catName} is already on her way over.`;
  if (awayMs < 14 * DAY) return `${catName} takes a moment, and then decides it is definitely you.`;
  if (awayMs < 60 * DAY) return `${catName} has been keeping your spot warm. she will deny this.`;
  return `${catName} settles in like you never left, which is the whole trick of her.`;
}
