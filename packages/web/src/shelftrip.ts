// Her trip to the shelf, as a function of the clock: she walks over, knocks the mug off, and the
// camera follows her, which is what brings the shelf into view at all.
export const SHELF_TRIP_MS = 2600;
export const SHELF_TIP_MS = 1750;
export const SHELF_REACH_X = 78;

export interface Trip {
  going: boolean;
  reaching: boolean;
  /* Hold the mug on the shelf. It goes over when she is under it, not when the room says so. */
  mugStillUp: boolean;
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
