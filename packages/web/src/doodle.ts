/**
 * The thing you draw for the other one, which hangs in the frame on the wall.
 *
 * Seven by five, because that is the size of the hole in the frame that has been on that wall since
 * the beginning. It is not much room. That is most of the point: at thirty-five pixels nobody is
 * making art, they are passing a note, and a face or a heart or an arrow is exactly as much as
 * anybody needs to say. Making the frame bigger to fit a better drawing would have cost the room its
 * composition and the gesture its lightness.
 */

export const DOODLE_W = 7;
export const DOODLE_H = 5;
export const DOODLE_CELLS = DOODLE_W * DOODLE_H;

/**
 * Index 0 is the mount showing through. The four after it are already in the room, so a drawing
 * never arrives in colours the rest of the place has never heard of.
 */
export const DOODLE_INK = ["", "#4a3520", "#e8ad55", "#d78aa0", "#7d9e63"] as const;

export const DOODLE_NAMES = ["rub out", "ink", "honey", "rose", "leaf"] as const;

/** An empty sheet. */
export const BLANK = "0".repeat(DOODLE_CELLS);

/** Exactly the right length, and only colours that exist. Anything else is not a drawing. */
export function isDoodle(value: unknown): value is string {
  return typeof value === "string" && value.length === DOODLE_CELLS && /^[0-4]+$/.test(value);
}

/** Nothing was drawn, so there is nothing to hang. Saving this takes the frame back to the fish. */
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
