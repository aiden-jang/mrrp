/*
 * Her trip to the shelf, as a function of the clock.
 *
 * Knocking the mug off used to be a state flip: `shelfDown` went true, the mug appeared on the floor
 * and she never moved. The shelf is at x 80-95 and the camera only reaches it when she is right of
 * 56, so her one deliberate act usually happened entirely off screen.
 *
 * The timing lives here rather than inside the draw loop because a canvas animation cannot be
 * checked by looking at it: an automated browser keeps its tabs hidden, and a hidden tab renders a
 * few frames and then freezes. This part can be tested; the drawing that consumes it cannot.
 */
export const SHELF_TRIP_MS = 2600;
/** When the mug goes over: long enough to have walked there and reached up for it. */
export const SHELF_TIP_MS = 1750;
/** Just left of the shelf, which sits at x 80. */
export const SHELF_REACH_X = 78;

export interface Trip {
  /** She is on her way, or still there having done it. */
  going: boolean;
  /** Reaching up. The pose that has her front off the floor. */
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
