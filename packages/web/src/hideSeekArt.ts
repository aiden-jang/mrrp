import { HIDE_SPOTS, type Cat, type HideSeek } from "./types.js";
import { catArtwork, catPalette, paintCatEyes } from "./catArt.js";
import { POSES } from "./sprites.js";

const PLACES = { curtain: { x: 55, y: 29 }, cushion: { x: 24, y: 72 }, cabinet: { x: 32, y: 42 } };
const HEAD = catArtwork(POSES.peek)!;

export function hideSeekLabel(game: HideSeek | null | undefined, role?: "him" | "her" | null) {
  if (!game) return null;
  const place = HIDE_SPOTS.find((s) => s.id === game.spot)?.place;
  return game.phase === "found"
    ? `Found ${place}. She peeks out.`
    : role === "her"
      ? `You’re hiding ${place}.`
      : "She’s hiding. Look around the room.";
}

export function paintHidePeek(
  rect: (x: number, y: number, w: number, h: number, color: string) => void,
  game: HideSeek | null | undefined,
  look: Cat,
) {
  if (!game?.spot) return;
  const place = PLACES[game.spot];
  const x = place.x;
  const y = place.y + (game.phase === "hiding" && game.spot !== "curtain" ? 7 : 0);
  const paint: typeof rect = (left, top, width, height, color) => {
    const edge = game.spot === "curtain" ? Math.max(left, 54) : left;
    if (left + width > edge) rect(edge, top, left + width - edge, height, color);
  };
  const palette: Record<string, string> = catPalette(look, true, (c) => c);
  const rows = game.phase === "found" ? 20 : 6;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < HEAD.rows[row]!.length; col++) {
      const color = palette[HEAD.rows[row]![col]!];
      if (color)
        paint(x + HEAD.ox + col * HEAD.step, y + HEAD.oy + row * HEAD.step, HEAD.step, HEAD.step, color);
    }
  }
  if (game.phase === "found")
    paintCatEyes(
      paint,
      "peek",
      x,
      y,
      catPalette(look, true, (c) => c),
      { awake: true, wink: false, gaze: 0 },
    );
}
