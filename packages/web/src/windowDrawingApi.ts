import { myToken } from "./api.js";
import { isWindowStroke, type Bodies, type WindowStroke, type WindowDrawing } from "./types.js";

export async function saveWindowStrokes(id: string, strokes: WindowStroke[]): Promise<WindowDrawing> {
  const body: Bodies["window-drawing"] = { me: myToken(id), strokes };
  const response = await fetch(`/api/room/${id}/window-drawing`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => {
    throw new Error("Couldn’t save your strokes. They’re still here. Try again.");
  });
  if (!response.ok) {
    const failure = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(
      failure?.error === "window full"
        ? "The window is full. Your unsaved strokes are still here."
        : "Couldn’t save your strokes. They’re still here. Try again.",
    );
  }
  const result = (await response.json()) as WindowDrawing;
  if (
    !Number.isSafeInteger(result.revision) ||
    result.revision < 0 ||
    !Array.isArray(result.strokes) ||
    !result.strokes.every(isWindowStroke) ||
    !strokes.every((stroke) =>
      (result.strokes as WindowStroke[]).some(
        (saved) =>
          saved.id === stroke.id &&
          saved.ink === stroke.ink &&
          JSON.stringify(saved.points) === JSON.stringify(stroke.points),
      ),
    )
  )
    throw new Error("Couldn’t confirm those strokes. They’re still here. Try again.");
  return result;
}
