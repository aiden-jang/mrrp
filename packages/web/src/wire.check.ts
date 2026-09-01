/*
 * The two types.ts files describe the same wire format and are maintained by hand.
 *
 * They are not copies: the worker's imports its weather and memory types, the browser's inlines
 * them, and the comments differ because each side reads them for different reasons. So nothing
 * stops a field being added to one and forgotten in the other, and neither package's typecheck
 * would notice: the browser would simply read `undefined` off every view, at runtime, in
 * production.
 *
 * Nothing imports this file. It exists so `tsc` fails when the two sides stop agreeing.
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
 * extra optional field, and an optional field is exactly what gets added to one side and forgotten
 * on the other.
 */
type Same<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

/* One per shape, so the compiler error names the one that drifted. */
export const roomViewAgrees: Same<ViewSent, RoomView> = true;
export const arrivalAgrees: Same<ArrivalSent, Arrival> = true;
export const saidSoFarAgrees: Same<SaidSent, SaidSoFar> = true;
export const told2Agrees: Same<Told2Sent, Told2> = true;
/* What the browser sends against what the worker reads, field by field. */
export const bodiesAgree: Same<BodiesSent, Bodies> = true;
