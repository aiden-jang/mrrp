import { isWindowBatch, WINDOW_STROKES_MAX, WINDOW_TOTAL_POINTS_MAX, type WindowStroke } from "./types.js";
import { seatRoles, type SeatPerson } from "./seatAccess.js";

export interface StoredWindowStroke extends WindowStroke {
  by: string;
}
export const WINDOW_ERRORS = {
  forbidden: "mrrp: window drawing not yours",
  conflict: "mrrp: window stroke changed",
  full: "mrrp: window full",
} as const;
export interface StoredWindowDrawing {
  revision: number;
  strokes: StoredWindowStroke[];
}
type Storage = Pick<DurableObjectTransaction, "get" | "put" | "delete">;

export async function append(storage: DurableObjectStorage, me: string, strokes: WindowStroke[]) {
  if (!isWindowBatch(strokes)) throw new Error(WINDOW_ERRORS.conflict);
  await storage.transaction(async (txn) => {
    const { him, her } = seatRoles((await txn.get<Record<string, SeatPerson>>("people")) ?? {});
    if ((await txn.get("deleted")) || (me !== him && me !== her)) throw new Error(WINDOW_ERRORS.forbidden);
    const saved = (await txn.get<StoredWindowDrawing>("windowDrawing")) ?? { revision: 0, strokes: [] };
    const added: StoredWindowStroke[] = [];
    for (const stroke of strokes) {
      const previous = saved.strokes.find((entry) => entry.id === stroke.id);
      if (previous) {
        if (
          previous.by !== me ||
          previous.ink !== stroke.ink ||
          JSON.stringify(previous.points) !== JSON.stringify(stroke.points)
        )
          throw new Error(WINDOW_ERRORS.conflict);
      } else added.push({ id: stroke.id, ink: stroke.ink, points: stroke.points, by: me });
    }
    const next = [...saved.strokes, ...added];
    if (
      next.length > WINDOW_STROKES_MAX ||
      next.reduce((total, stroke) => total + stroke.points.length, 0) > WINDOW_TOTAL_POINTS_MAX
    )
      throw new Error(WINDOW_ERRORS.full);
    if (added.length) await txn.put("windowDrawing", { revision: saved.revision + 1, strokes: next });
  });
}

export async function view(storage: Storage, me: string, him: string | null, her: string | null) {
  if (me !== him && me !== her) return null;
  const saved = await storage.get<StoredWindowDrawing>("windowDrawing");
  return {
    revision: saved?.revision ?? 0,
    strokes: (saved?.strokes ?? [])
      .filter((stroke) => stroke.by === him || stroke.by === her)
      .map(({ id, ink, points }) => ({ id, ink, points })),
  };
}

export async function takeSeat(storage: Storage, seat: string) {
  const saved = await storage.get<StoredWindowDrawing>("windowDrawing");
  if (!saved || !saved.strokes.some((stroke) => stroke.by === seat)) return [];
  await storage.put("windowDrawing", {
    revision: saved.revision + 1,
    strokes: saved.strokes.filter((stroke) => stroke.by !== seat),
  });
  return saved.strokes
    .filter((stroke) => stroke.by === seat)
    .map(({ id, ink, points }) => ({ id, ink, points }));
}

export async function restoreSeat(storage: Storage, strokes: WindowStroke[], seat: string) {
  if (!strokes.length) return;
  const saved = (await storage.get<StoredWindowDrawing>("windowDrawing")) ?? { revision: 0, strokes: [] };
  const ids = new Set(saved.strokes.map((stroke) => stroke.id));
  const restored = strokes.map((stroke) => ({
    ...stroke,
    id: ids.has(stroke.id) ? crypto.randomUUID() : stroke.id,
    by: seat,
  }));
  await storage.put("windowDrawing", {
    revision: saved.revision + 1,
    strokes: [...saved.strokes, ...restored],
  });
}
