export const DOODLE_W = 11;
export const DOODLE_H = 7;

/*
 * It was seven by five, which is the size the hole in the frame had been since before anybody could
 * draw in it. Thirty-five pixels is enough for a face and not much else, and in use it turned out to
 * be past charming and into fiddly, so the frame grew to fit a bigger sheet rather than the other way
 * round.
 */
export const OLD_W = 7;
export const OLD_H = 5;
export const OLD_CELLS = OLD_W * OLD_H;
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
 * An old seven-by-five drawing, centred in the bigger sheet.
 *
 * There are drawings hanging in real rooms right now. Growing the grid without this would have blanked
 * them, which is the sort of thing that is nobody's fault and unforgivable anyway.
 */
export function widen(cells: string): string {
  if (cells.length !== OLD_CELLS) return cells;
  const dx = Math.floor((DOODLE_W - OLD_W) / 2);
  const dy = Math.floor((DOODLE_H - OLD_H) / 2);
  let out = BLANK;
  for (let y = 0; y < OLD_H; y++) {
    for (let x = 0; x < OLD_W; x++) {
      out = withCell(out, x + dx, y + dy, Number(cells[y * OLD_W + x] ?? 0));
    }
  }
  return out;
}
