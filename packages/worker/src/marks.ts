/** A thing he left in the room: the day it happened, and the moment. */
export interface Mark {
  day: number;
  at: number;
}

/*
 * How long a mark he left stays in the room.
 *
 * The day it was left, and then until she has actually opened the room and seen it.
 *
 * The day on its own is not enough, because these are day numbers rather than timers: a brush at
 * eleven at night is gone by midnight, an hour later, while a morning one lasts fifteen hours. The
 * marks exist to be found by somebody who was not there, so the one left last thing at night is
 * exactly the one she is most likely to miss.
 */
export function markLives(left: Mark | undefined, today: number, herLastLook: number): boolean {
  if (!left) return false;
  return left.day === today || left.at > herLastLook;
}
