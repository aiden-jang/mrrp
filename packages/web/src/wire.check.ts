/*
 * The two types.ts files describe the same wire format and are kept by hand. Add a field to one and
 * forget the other and both packages still typecheck: the browser just reads `undefined` off every
 * view, at runtime, in production. Nothing imports this file. It exists so `tsc` fails on drift.
 */
import type {
  Arrival as ArrivalSent,
  Bodies as BodiesSent,
  RoomView as ViewSent,
  SaidSoFar as SaidSent,
  Told2 as Told2Sent,
} from "../../worker/src/types.js";
import type { Arrival, Bodies, RoomView, SaidSoFar, Told2 } from "./types.js";

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
