import { hourIn } from "./hours.js";
import type { RoomView } from "./types.js";

/** "a, b and c", or null when there is nothing to name. */
export function listOf(parts: (string | false | null | undefined)[]): string | null {
  const kept = parts.filter((v): v is string => typeof v === "string" && v.length > 0);
  if (kept.length === 0) return null;
  if (kept.length === 1) return kept[0]!;
  return `${kept.slice(0, -1).join(", ")} and ${kept[kept.length - 1]}`;
}

/* Her day, not his. His midnight can be most of a day away from the one that clears the room. */
export function untilMidnight(tz: string, at = Date.now()): number {
  return 24 - hourIn(tz, at);
}

function inAbout(hours: number): string {
  if (hours < 1) return "in under an hour";
  if (hours < 1.5) return "in about an hour";
  return `in about ${Math.round(hours)} hours`;
}

/*
 * When what is in the room goes.
 *
 * Three lifetimes share one room: most marks clear at her midnight, the photo never goes, and what
 * he leaves out waits until she finds it. His side has to say whose midnight it means.
 */
export function fadeNote(view: RoomView, mine: "him" | "her", at = Date.now()): string | null {
  const hours = untilMidnight(view.clock.tz, at);
  const parts: string[] = [];

  if (mine === "him") {
    const daily = listOf([view.brushed && "the tuft", view.satWith && "the dent", view.boxOut && "the box"]);
    const one = [view.brushed, view.satWith, view.boxOut].filter(Boolean).length === 1;
    if (daily) parts.push(`${daily} ${one ? "goes" : "go"} at midnight where she is, ${inAbout(hours)}.`);
    if (view.framed) parts.push("The picture stays up.");
    if (view.forHer) parts.push("What you left out waits until she finds it.");
  } else {
    if (view.box) parts.push(`The box goes at midnight, ${inAbout(hours)}.`);
    if (view.shelfDown) parts.push("The mug stays on the floor until one of you puts it back.");
  }

  return parts.length > 0 ? parts.join(" ") : null;
}
