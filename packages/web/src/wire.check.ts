/*
 * The two types.ts files describe the same wire format and are kept by hand. Add a field to one and
 * forget the other and both packages still typecheck: the browser just reads `undefined` off every
 * view, at runtime, in production. Nothing imports this file. It exists so `tsc` fails on drift.
 */
import type {
  Action as ActionSent,
  Arrival as ArrivalSent,
  Bodies as BodiesSent,
  CatAct as CatActSent,
  Gift as GiftSent,
  Mood as MoodSent,
  RoomView as ViewSent,
  SaidSoFar as SaidSent,
  Told2 as Told2Sent,
  Treat as TreatSent,
} from "../../worker/src/types.js";
import {
  ACTIONS as ACTIONS_SENT,
  CAT_ACTS as CAT_ACTS_SENT,
  GIFTS as GIFTS_SENT,
  LINE_MAX as LINE_MAX_SENT,
  MOODS as MOODS_SENT,
  NOTES_KEPT as NOTES_KEPT_SENT,
  NOTE_MAX as NOTE_MAX_SENT,
  TREATS as TREATS_SENT,
} from "../../worker/src/types.js";
import type {
  Action,
  Arrival,
  Bodies,
  CatAct,
  Gift,
  Mood,
  RoomView,
  SaidSoFar,
  Told2,
  Treat,
} from "./types.js";
import { ACTIONS, CAT_ACTS, GIFTS, LINE_MAX, MOODS, NOTES_KEPT, NOTE_MAX, TREATS } from "./types.js";

/*
 * Identity, not mutual assignability. `[A] extends [B]` calls two shapes the same when one has an
 * extra optional field, and an optional field is exactly what gets added to one side and forgotten on
 * the other.
 */
type Same<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

/* One per shape, so the compiler error names the one that drifted. */
export const roomViewAgrees: Same<ViewSent, RoomView> = true;
export const arrivalAgrees: Same<ArrivalSent, Arrival> = true;
export const saidSoFarAgrees: Same<SaidSent, SaidSoFar> = true;
export const told2Agrees: Same<Told2Sent, Told2> = true;
export const bodiesAgree: Same<BodiesSent, Bodies> = true;

/* An id in one and not the other is the room refusing something the app just offered. */
export const actionsAgree: Same<ActionSent, Action> = true;
export const catActsAgree: Same<CatActSent, CatAct> = true;
export const treatsAgree: Same<TreatSent, Treat> = true;
export const moodsAgree: Same<MoodSent, Mood> = true;
export const giftsAgree: Same<GiftSent, Gift> = true;

/*
 * The lists themselves, down to the wording. They are `as const` so their literal types carry every
 * label, and the same sentence has to be written twice for the two of them to read the same thing.
 */
export const actionListAgrees: Same<typeof ACTIONS_SENT, typeof ACTIONS> = true;
export const catActListAgrees: Same<typeof CAT_ACTS_SENT, typeof CAT_ACTS> = true;
export const treatListAgrees: Same<typeof TREATS_SENT, typeof TREATS> = true;
export const moodListAgrees: Same<typeof MOODS_SENT, typeof MOODS> = true;
export const giftListAgrees: Same<typeof GIFTS_SENT, typeof GIFTS> = true;

/* Trimmed on the way in, counted on the way out. Two different numbers silently lose the tail. */
export const lineMaxAgrees: Same<typeof LINE_MAX_SENT, typeof LINE_MAX> = true;
export const noteMaxAgrees: Same<typeof NOTE_MAX_SENT, typeof NOTE_MAX> = true;
export const notesKeptAgrees: Same<typeof NOTES_KEPT_SENT, typeof NOTES_KEPT> = true;
