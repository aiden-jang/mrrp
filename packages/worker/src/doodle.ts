export const DOODLE_W = 15;
export const DOODLE_H = 9;
export const DOODLE_CELLS = DOODLE_W * DOODLE_H;

/*
 * Every size the sheet has ever been. A room nobody has opened in a year still holds whatever it
 * held, so never take a size off this list: the drawing is stored as a flat string and the only way
 * back to a grid is knowing which width it was written at.
 */
const PAST_DOODLES: [number, number][] = [
  [7, 5],
  [11, 7],
];

export function widenDoodle(cells: string): string {
  const was = PAST_DOODLES.find(([w, h]) => w * h === cells.length);
  if (!was) return cells;
  const [oldW, oldH] = was;
  const dx = Math.floor((DOODLE_W - oldW) / 2);
  const dy = Math.floor((DOODLE_H - oldH) / 2);
  const out = Array.from({ length: DOODLE_CELLS }, () => "0");
  for (let y = 0; y < oldH; y++) {
    for (let x = 0; x < oldW; x++) out[(y + dy) * DOODLE_W + (x + dx)] = cells[y * oldW + x]!;
  }
  return out.join("");
}
