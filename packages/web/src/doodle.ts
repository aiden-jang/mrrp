export const DOODLE_W = 7;
export const DOODLE_H = 5;
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
