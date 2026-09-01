import type { Action } from "./types.js";
import type { DiscoveryKey } from "./discoveries.js";
import type { Personality } from "./types.js";

type Trait = Personality["trait"];

export type DreamScene = "mouse" | "moth" | "piano" | "stars" | "box" | "brush" | "fish" | "sun";

export interface Dream {
  scene: DreamScene;
  /*
   * Written so either seat can read it.
   *
   * Both of them watch the same sleeping cat, and one of them is her, so "she is dreaming about
   * food" was the room narrating her own sleep back to her. There is no second phrasing here
   * because a dream does not need a subject: it is the inside of a head, and naming whose head it
   * is adds nothing to it.
   */
  line: string;
}

export interface DreamContext {
  found: readonly DiscoveryKey[];
  recent: readonly (Action | "leaveout")[];
  trait: Trait | null;
  framed: boolean;
  hasBox: boolean;
}

const FROM_FOUND: Partial<Record<DiscoveryKey, { scene: DreamScene; line: string }>> = {
  mouse: { scene: "mouse", line: "the mouse, and it gets away." },
  music: { scene: "moth", line: "something small and winged, going round a light." },
  piano: { scene: "piano", line: "paws moving. somewhere in there, a piano." },
  constellation: { scene: "stars", line: "stars, from the inside this time." },
  box: { scene: "box", line: "a box. of course it is a box." },
  catnip: { scene: "fish", line: "whatever this one is, it is going well." },
};

const FROM_ACTION: Partial<Record<Action | "leaveout", { scene: DreamScene; line: string }>> = {
  brush: { scene: "brush", line: "being brushed, somewhere behind shut eyes." },
  leaveout: { scene: "fish", line: "food. this is not a surprise." },
  photo: { scene: "sun", line: "a bright square of light, and somebody holding still." },
};

const FROM_TRAIT: Partial<Record<Trait, { scene: DreamScene; line: string }>> = {
  petted: { scene: "sun", line: "a warm patch, and a hand that keeps going." },
  brushed: { scene: "brush", line: "being brushed, somewhere behind shut eyes." },
  fed: { scene: "fish", line: "food. this is not a surprise." },
  accompanied: { scene: "sun", line: "somebody sat nearby. that is the whole dream." },
  photographed: { scene: "sun", line: "a bright square of light, and somebody holding still." },
};

const PLAIN: { scene: DreamScene; line: string }[] = [
  { scene: "fish", line: "a fish, probably. it usually is." },
  { scene: "sun", line: "a warm patch of floor that keeps moving." },
  { scene: "moth", line: "something small, nearly caught." },
];

// Never dream about a secret this reader has not found. Naming the piano tells them there is a
// piano, and a sleeping cat is the last place you would look for a leak. That is why this gathers
// candidates and filters, instead of looking one up. `seed` is a parameter so a test can pin it.
export function dreamOf(context: DreamContext, seed: number): Dream {
  const found = new Set(context.found);
  const candidates: { scene: DreamScene; line: string }[] = [];

  for (const key of Object.keys(FROM_FOUND) as DiscoveryKey[]) {
    if (found.has(key)) candidates.push(FROM_FOUND[key]!);
  }
  // A box in the room right now is not a secret being given away.
  if (context.hasBox) candidates.push({ scene: "box", line: "a box. of course it is a box." });
  for (const action of context.recent) {
    const from = FROM_ACTION[action];
    if (from) candidates.push(from);
  }
  if (context.trait && FROM_TRAIT[context.trait]) candidates.push(FROM_TRAIT[context.trait]!);
  if (context.framed)
    candidates.push({ scene: "sun", line: "a bright square of light, and somebody holding still." });

  const pool = candidates.length > 0 ? dedupe(candidates) : PLAIN;
  return pool[Math.abs(Math.trunc(seed)) % pool.length]!;
}

// The same dream is reachable two ways (brushed lately, brushed always). It should appear once.
function dedupe(dreams: { scene: DreamScene; line: string }[]): { scene: DreamScene; line: string }[] {
  const seen = new Set<string>();
  return dreams.filter((dream) => (seen.has(dream.line) ? false : (seen.add(dream.line), true)));
}
