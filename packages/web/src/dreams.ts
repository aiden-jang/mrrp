import type { Action } from "./types.js";
import type { DiscoveryKey } from "./discoveries.js";
import type { Personality } from "./types.js";

type Trait = Personality["trait"];

/*
 * What she dreams about, when somebody settles her on the bed twice.
 *
 * The dream was three rising pixels and nothing else: pretty, and about nothing. This gives it a
 * subject, and the subject is the room's own history, so a nap becomes the one place the room shows
 * you what has happened in it rather than counting it.
 *
 * The rule that shapes everything here is the one discoveries.ts already sets: she never dreams about
 * a secret you have not found. Dreaming of the piano would tell somebody there is a piano, which is
 * the whole thing they were going to enjoy discovering, and it would leak it through the softest,
 * least suspicious surface in the app.
 */

export type DreamScene = "mouse" | "moth" | "piano" | "stars" | "box" | "brush" | "fish" | "sun";

export interface Dream {
  scene: DreamScene;
  /** One line, lowercase, in the room's voice. Never a count and never an instruction. */
  line: string;
}

export interface DreamContext {
  /** Secrets this person has found. Anything not in here cannot be dreamt about. */
  found: readonly DiscoveryKey[];
  /** What the other person has done lately. Empty on the side that does the doing. */
  recent: readonly Action[];
  trait: Trait | null;
  framed: boolean;
  hasBox: boolean;
}

/** Discoveries that have a picture worth dreaming. Others are real but do not draw as anything. */
const FROM_FOUND: Partial<Record<DiscoveryKey, { scene: DreamScene; line: string }>> = {
  mouse: { scene: "mouse", line: "she is dreaming about the mouse. it gets away." },
  music: { scene: "moth", line: "something small and winged, going round a light." },
  piano: { scene: "piano", line: "her paws are moving. somewhere in there, a piano." },
  constellation: { scene: "stars", line: "stars, from the inside of her head this time." },
  box: { scene: "box", line: "a box. of course it is a box." },
  catnip: { scene: "fish", line: "whatever this one is, she is enjoying it." },
};

const FROM_ACTION: Partial<Record<Action, { scene: DreamScene; line: string }>> = {
  brush: { scene: "brush", line: "she is being brushed, somewhere behind her eyes." },
  bring: { scene: "fish", line: "she is dreaming about food. this is not a surprise." },
  photo: { scene: "sun", line: "a bright square of light, and somebody holding still." },
};

const FROM_TRAIT: Partial<Record<Trait, { scene: DreamScene; line: string }>> = {
  petted: { scene: "sun", line: "a warm patch, and a hand that keeps going." },
  brushed: { scene: "brush", line: "she is being brushed, somewhere behind her eyes." },
  fed: { scene: "fish", line: "she is dreaming about food. this is not a surprise." },
  accompanied: { scene: "sun", line: "somebody sat nearby. that is the whole dream." },
  photographed: { scene: "sun", line: "a bright square of light, and somebody holding still." },
};

/** When nothing has happened yet. Never "nothing": a cat with no history still dreams. */
const PLAIN: { scene: DreamScene; line: string }[] = [
  { scene: "fish", line: "a fish, probably. it usually is." },
  { scene: "sun", line: "a warm patch of floor that moved when she did." },
  { scene: "moth", line: "something small she nearly caught." },
];

/**
 * Pick a dream.
 *
 * `seed` rotates the choice so two naps in a row are not the same picture, and is a parameter rather
 * than `Math.random()` so a test can pin it. Candidates are gathered in preference order and the seed
 * only chooses among them, which keeps the good ones (things that actually happened) ahead of the
 * generic ones without making the result fixed.
 */
export function dreamOf(context: DreamContext, seed: number): Dream {
  const found = new Set(context.found);
  const candidates: { scene: DreamScene; line: string }[] = [];

  for (const key of Object.keys(FROM_FOUND) as DiscoveryKey[]) {
    // The spoiler rule, and the only reason this is a filter and not a lookup.
    if (found.has(key)) candidates.push(FROM_FOUND[key]!);
  }
  // A box is in the room right now, so it is not a secret being given away.
  if (context.hasBox) candidates.push({ scene: "box", line: "a box. of course it is a box." });
  for (const action of context.recent) {
    const from = FROM_ACTION[action];
    if (from) candidates.push(from);
  }
  if (context.trait && FROM_TRAIT[context.trait]) candidates.push(FROM_TRAIT[context.trait]!);
  if (context.framed) candidates.push({ scene: "sun", line: "a bright square of light, and somebody holding still." });

  const pool = candidates.length > 0 ? dedupe(candidates) : PLAIN;
  return pool[Math.abs(Math.trunc(seed)) % pool.length]!;
}

/** The same dream can be reached two ways (brushed lately and brushed always); it should appear once. */
function dedupe(dreams: { scene: DreamScene; line: string }[]): { scene: DreamScene; line: string }[] {
  const seen = new Set<string>();
  return dreams.filter((dream) => (seen.has(dream.line) ? false : (seen.add(dream.line), true)));
}
