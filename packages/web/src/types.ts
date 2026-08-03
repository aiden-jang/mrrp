/** The contract between the Worker and the web client. */

export type Action = "pet" | "brush" | "feed" | "sit";

export const ACTIONS: { id: Action; label: string; past: string }[] = [
  { id: "pet", label: "Pet her", past: "petted her" },
  { id: "brush", label: "Brush her", past: "brushed her" },
  { id: "feed", label: "Feed her", past: "fed her" },
  { id: "sit", label: "Sit with her", past: "sat with her a while" },
];

/** How the cat looks. Set once when the room is made, so she can resemble a real cat. */
export interface Cat {
  name: string;
  fur: string;
  furDk: string;
  belly: string;
  eyes: string;
  tabby: boolean;
}

export interface Visit {
  at: number;
  who: string;
  action: Action;
}

export interface RoomView {
  cat: Cat;
  /** Your own display name, once you've claimed a seat. */
  you: string | null;
  /** The other person's name, if they've been here. */
  them: string | null;
  /** When they were last here, ms epoch. */
  themLastAt: number | null;
  /** The last few things THEY did. Yours are not echoed back; that's not the point. */
  theirRecent: Visit[];
  /** True when nobody has taken the second seat yet. */
  waitingForThem: boolean;
}
