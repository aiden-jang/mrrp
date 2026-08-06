import type { Mood } from "./types.js";
import type { Pose } from "./sprites.js";

/**
 * What the cat does about it.
 *
 * ─── The one rule this file exists to enforce ────────────────────────────────
 *  The cat NEVER mirrors a low mood. She answers it.
 *
 *  A cat that gets sad when you're sad is a cat you have to protect, so on the
 *  days it matters you'd tap "good" to spare her, and the feature would be dead.
 *  So: sad brings her over and she stays. Stressed and she sits on you and won't
 *  be moved. The room gets warmer and closer for a low mood, never darker.
 *
 *  `snug` is that closeness. `play` is liveliness. Nothing here has a downside.
 *
 *  `doing` completes "<name> is ___", so every line has to be a participle.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export interface Response {
  /** What she's doing about it, shown under the room. Authored per mood, not assembled. */
  doing: string;
  /** 0-1. How close and warm the room reads. High for the moods that need holding. */
  snug: number;
  /** 0-1. Liveliness: tail, small movements, bounce. */
  play: number;
  /** Overrides where she is, 0-1 across the room. Undefined leaves her following the light. */
  catX?: number;
  /** Overrides how shut her eyes are. */
  sleepy?: number;
  /**
   * How open her eyes are, 0-1, independent of where your cursor is. Being looked at is the entire
   * response to "sad", so it cannot depend on the reader happening to hover over her.
   */
  eyes: number;
  /** She purrs without being touched. Only for the moods where that's the point. */
  purring: boolean;
  /** Which pose. Named per mood rather than derived, so "good" isn't the same as "bored". */
  pose: Pose;
  /** Little sparks around her. Reserved for good, so it stays special. */
  sparkle?: boolean;
}

export const RESPONSES: Record<Mood, Response> = {
  /*
   * The three blunt ones.
   *
   * "feral" and "done" follow the rule: the room gets livelier or closer, never darker. "horny" breaks it
   * on purpose, because it is a joke rather than a low mood, and the funniest available answer is that the
   * cat wants no part of this and is leaving. An absent cat is a colder room; being the punchline earns it.
   */
  feral: {
    pose: "play",
    eyes: 1,
    doing: "up on her back legs, absolutely unhinged, and everything on that shelf is in danger",
    snug: 0.2,
    play: 1,
    sleepy: 0,
    purring: false,
  },
  done: {
    pose: "loaf",
    eyes: 0.1,
    doing: "lying flat out on the boards like she has been switched off at the wall",
    snug: 0.9,
    play: 0,
    sleepy: 0.7,
    purring: true,
  },
  horny: {
    pose: "stand",
    eyes: 0.9,
    doing: "suddenly extremely interested in the door and leaving without further comment",
    snug: 0.3,
    play: 0.4,
    catX: 0.12,
    sleepy: 0,
    purring: false,
  },
  good: {
    pose: "perk",
    sparkle: true,
    eyes: 0.85,
    doing: "batting at the dust in the sunbeam, badly",
    snug: 0.1,
    play: 1,
    sleepy: 0,
    purring: false,
  },
  tired: {
    pose: "loaf",
    eyes: 0.2,
    // Not asleep. Next to you, doing the same nothing you are.
    doing: "loafing right next to you, doing exactly as little as you are",
    snug: 0.7,
    play: 0,
    sleepy: 0.55,
    purring: true,
  },
  stressed: {
    // The weighted-blanket answer: she is not worried, she is heavy. The loaf rather than the upright
    // sit, so stressed and sad don't render as the same cat.
    pose: "loaf",
    eyes: 0.55,
    doing: "sitting on you, with no plans to move and no worries about any of it",
    snug: 1,
    play: 0,
    catX: 0.5,
    sleepy: 0.25,
    purring: true,
  },
  sad: {
    pose: "sit",
    eyes: 1,
    // She comes over and stays. Eyes open, because being looked at is the point.
    doing: "sitting with you, and she isn't going anywhere",
    snug: 1,
    play: 0,
    catX: 0.5,
    sleepy: 0,
    purring: true,
  },
  lonely: {
    pose: "stand",
    eyes: 0.9,
    doing: "already at the door, and she was there before you said anything",
    snug: 0.85,
    play: 0.15,
    catX: 0.19,
    sleepy: 0,
    purring: true,
  },
  bored: {
    pose: "play",
    eyes: 0.95,
    doing: "sitting next to the one thing she knocked off the shelf, waiting to see what you do",
    snug: 0.2,
    play: 0.8,
    // By the shelf, because that is where the copy says the crime happened.
    catX: 0.84,
    sleepy: 0,
    purring: false,
  },
};
