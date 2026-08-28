import type { Milestone, Personality } from "./types.js";

export function milestoneLine(milestone: Milestone, catName: string): string {
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

export function personalityLine(personality: Personality, youAreHer: boolean, them: string | null): string {
  const line = TRAIT_LINES[personality.trait];
  return youAreHer ? line.hers(them ?? "he") : line.his;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export const AWAY_FLOOR_MS = 8 * HOUR;

export function awayLine(awayMs: number | null, catName: string): string | null {
  if (awayMs === null || awayMs < AWAY_FLOOR_MS) return null;
  if (awayMs < DAY) return `${catName} looks up. she was not expecting you until later.`;
  if (awayMs < 4 * DAY) return `${catName} is already on her way over.`;
  if (awayMs < 14 * DAY) return `${catName} takes a moment, and then decides it is definitely you.`;
  if (awayMs < 60 * DAY) return `${catName} has been keeping your spot warm. she will deny this.`;
  return `${catName} settles in like you never left, which is the whole trick of her.`;
}

/*
 * That she has worked out when you actually get in.
 *
 * Told to him alone, because it is about him, and because to her it would read as the room reporting
 * on somebody. Sits low in the quiet lines: rarer than the moon and less important than an
 * anniversary, and it stops being news the moment he has read it once.
 */
export function homingLine(expectAt: number | null, told: number, catName: string): string | null {
  if (expectAt === null) return null;
  const earlier = expectAt < told;
  const clock = `${String(Math.floor(expectAt) % 24).padStart(2, "0")}:${String(Math.round((expectAt % 1) * 60)).padStart(2, "0")}`;
  return earlier
    ? `${catName} has started waiting at the door around ${clock}, which is when you actually get in.`
    : `${catName} has stopped expecting you at ${String(told).padStart(2, "0")}:00. She waits nearer ${clock} now.`;
}
