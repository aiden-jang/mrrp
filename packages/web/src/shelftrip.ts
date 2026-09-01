/*
 * Her trip to the shelf, as a function of the clock.
 *
 * She walks over and knocks the mug off, and the camera follows her, which is the only thing that
 * ever brings the shelf into view: it sits at x 80-95 and the camera only reaches it when she does.
 *
 * The timing lives out here so it can be tested. The drawing that uses it cannot be.
 */
export const SHELF_TRIP_MS = 2600;
/** When the mug goes over: long enough to have walked there and reached up for it. */
export const SHELF_TIP_MS = 1750;
/** Just left of the shelf, which sits at x 80. */
export const SHELF_REACH_X = 78;

export interface Trip {
  going: boolean;
  reaching: boolean;
  /** Hold the mug on the shelf. It goes over when she is under it, not when the room says so. */
  mugStillUp: boolean;
  /** The frame the mug goes over on, for the thump and her looking at it. Exactly one frame. */
  tips: boolean;
}

export function shelfTrip(age: number, lastFrameAge: number): Trip {
  const going = age >= 0 && age < SHELF_TRIP_MS;
  return {
    going,
    reaching: going && age >= SHELF_TIP_MS - 450 && age < SHELF_TIP_MS + 250,
    mugStillUp: going && age < SHELF_TIP_MS,
    // Crossed the line since the last frame. Never true twice for one trip, however slow the frames.
    tips: going && age >= SHELF_TIP_MS && lastFrameAge < SHELF_TIP_MS,
  };
}
