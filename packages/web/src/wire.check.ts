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
  LINE_MAX as LINE_MAX_SENT,
  NOTES_KEPT as NOTES_KEPT_SENT,
  NOTE_MAX as NOTE_MAX_SENT,
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
import { LINE_MAX, NOTES_KEPT, NOTE_MAX } from "./types.js";

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

/*
 * The names of everything either side is allowed to send. The lists themselves carry labels and
 * cannot be compared this way, but an id in one and not the other is what makes the room refuse
 * something the app just offered.
 */
export const actionsAgree: Same<ActionSent, Action> = true;
export const catActsAgree: Same<CatActSent, CatAct> = true;
export const treatsAgree: Same<TreatSent, Treat> = true;
export const moodsAgree: Same<MoodSent, Mood> = true;
export const giftsAgree: Same<GiftSent, Gift> = true;

/* Trimmed on the way in, counted on the way out. Two different numbers silently lose the tail. */
export const lineMaxAgrees: Same<typeof LINE_MAX_SENT, typeof LINE_MAX> = true;
export const noteMaxAgrees: Same<typeof NOTE_MAX_SENT, typeof NOTE_MAX> = true;
export const notesKeptAgrees: Same<typeof NOTES_KEPT_SENT, typeof NOTES_KEPT> = true;
