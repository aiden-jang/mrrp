export interface Mark {
  day: number;
  at: number;
}

// How long a mark he left stays in the room: the day it happened, and then until she has actually
// opened the room and been told about it.
export function markLives(left: Mark | undefined, today: number, herLastLook: number): boolean {
  if (!left) return false;
  return left.day === today || left.at > herLastLook;
}
