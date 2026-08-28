export const DOODLE_W = 15;
export const DOODLE_H = 9;

/*
 * It started at seven by five, which was the size of the hole in the picture frame, and the frame had
 * been on that wall since before anybody could draw in it. Thirty-five pixels is enough for a face and
 * nothing else. It has grown twice since, and each time the frame was redrawn around it rather than
 * the other way round: the sheet is painted into the hole one pixel to one room pixel, so the frame is
 * the constraint and a bigger drawing means a bigger frame.
 */
const PAST_SIZES: [number, number][] = [
  [7, 5],
  [11, 7],
];

export const DOODLE_CELLS = DOODLE_W * DOODLE_H;

export const DOODLE_INK = ["", "#4a3520", "#e8ad55", "#d78aa0", "#7d9e63"] as const;

export const DOODLE_NAMES = ["rub out", "ink", "honey", "rose", "leaf"] as const;

export const BLANK = "0".repeat(DOODLE_CELLS);

export function isBlank(cells: string): boolean {
  return !/[1-4]/.test(cells);
}

export function cellAt(cells: string, x: number, y: number): number {
  return Number(cells[y * DOODLE_W + x] ?? 0);
}

export function withCell(cells: string, x: number, y: number, ink: number): string {
  const i = y * DOODLE_W + x;
  if (i < 0 || i >= DOODLE_CELLS) return cells;
  return cells.slice(0, i) + String(ink) + cells.slice(i + 1);
}

/**
 * A drawing made when the sheet was smaller, centred in the sheet it is now.
 *
 * There are drawings hanging in real rooms. Growing the grid without this would have blanked them,
 * which is the sort of thing that is nobody's fault and unforgivable anyway. Every past size stays in
 * the list forever, because a room somebody has not opened in a year still has whatever it had.
 */
export function widen(cells: string): string {
  const was = PAST_SIZES.find(([w, h]) => w * h === cells.length);
  if (!was) return cells;
  const [oldW, oldH] = was;
  const dx = Math.floor((DOODLE_W - oldW) / 2);
  const dy = Math.floor((DOODLE_H - oldH) / 2);
  let out = BLANK;
  for (let y = 0; y < oldH; y++) {
    for (let x = 0; x < oldW; x++) {
      out = withCell(out, x + dx, y + dy, Number(cells[y * oldW + x] ?? 0));
    }
  }
  return out;
}
