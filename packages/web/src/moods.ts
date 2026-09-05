import type { Mood } from "./types.js";
import type { Pose } from "./sprites.js";

export interface Response {
  /* What she is doing, as he reads it. Several address him: "sitting on you", "loafing right next to you". */
  doing: string;
  /* The same moment as she reads it, so "sitting on you" becomes "settled in". Falls back to `doing`. */
  doingHers?: string;
  snug: number;
  play: number;
  catX?: number;
  sleepy?: number;
  eyes: number;
  purring: boolean;
  pose: Pose;
  sparkle?: boolean;
  visual: MoodVisual;
}

export type MoodVisual =
  "spark" | "throw" | "quilt" | "warm-pool" | "door-light" | "floor-toys" | "paper" | "blanket" | "exit-line";

export const RESPONSES: Record<Mood, Response> = {
  feral: {
    visual: "paper",
    pose: "play",
    eyes: 1,
    doing: "up on two legs, absolutely unhinged, and everything on that shelf is in danger",
    snug: 0.2,
    play: 1,
    sleepy: 0,
    purring: false,
  },
  done: {
    visual: "blanket",
    pose: "loaf",
    eyes: 0.1,
    doing: "lying flat out on the boards like somebody switched the wall off",
    snug: 0.9,
    play: 0,
    sleepy: 0.7,
    purring: true,
  },
  horny: {
    visual: "exit-line",
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
    visual: "spark",
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
    visual: "throw",
    pose: "loaf",
    eyes: 0.2,
    doing: "loafing right next to you, doing exactly as little as you are",
    doingHers: "loafing, doing exactly as little as you feel like",
    snug: 0.7,
    play: 0,
    sleepy: 0.55,
    purring: true,
  },
  stressed: {
    visual: "quilt",
    pose: "loaf",
    eyes: 0.55,
    doing: "sitting on you, with no plans to move and no worries about any of it",
    doingHers: "settled in, with no plans to move and no worries about any of it",
    snug: 1,
    play: 0,
    catX: 0.5,
    sleepy: 0.25,
    purring: true,
  },
  sad: {
    visual: "warm-pool",
    pose: "sit",
    eyes: 1,
    doing: "sitting with you, and she isn't going anywhere",
    doingHers: "curled up, and not going anywhere",
    snug: 1,
    play: 0,
    catX: 0.5,
    sleepy: 0,
    purring: true,
  },
  lonely: {
    visual: "door-light",
    pose: "stand",
    eyes: 0.9,
    doing: "already at the door, and she was there before you said anything",
    doingHers: "already at the door, waiting",
    snug: 0.85,
    play: 0.15,
    catX: 0.19,
    sleepy: 0,
    purring: true,
  },
  bored: {
    visual: "floor-toys",
    pose: "play",
    eyes: 0.95,
    doing: "sitting next to the one thing she knocked off the shelf, waiting to see what you do",
    doingHers: "next to the thing you knocked off the shelf, waiting to see what happens",
    snug: 0.2,
    play: 0.8,
    catX: 0.84,
    sleepy: 0,
    purring: false,
  },
};
