// prettier-ignore
const FACES: Record<string, string[]> = {
  good:     [".x...x.", ".......", "x.....x", ".xxxxx.", "......."],
  tired:    ["xxx.xxx", ".......", "..xxx..", ".......", "......."],
  stressed: [".x...x.", ".......", "xx.x.xx", ".......", "x......"],
  sad:      [".x...x.", ".......", ".xxxxx.", "x.....x", "......."],
  lonely:   ["..x.x..", ".......", "...xx..", ".......", "......."],
  bored:    ["xxx.xxx", ".......", "...xxx.", ".......", "......."],
  feral:    ["x.x.x.x", ".......", "x.x.x.x", ".xxxxx.", "......."],
  done:     ["xx...xx", ".......", ".xxxxx.", ".......", "......."],
  horny:    [".x...xx", ".......", "..xxx..", "...x...", "......."],
};

export const FACE_KEYS = Object.keys(FACES);

export function MoodFace({ mood, color, size = 21 }: { mood: string; color: string; size?: number }) {
  const rows = FACES[mood];
  if (!rows) return null;
  const w = rows[0]!.length,
    h = rows.length;
  const px = size / w;
  return (
    <svg
      width={size}
      height={px * h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden
      style={{ display: "block", shapeRendering: "crispEdges" }}
    >
      {rows.flatMap((row, y) =>
        [...row].map((c, x) =>
          c === "x" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} /> : null,
        ),
      )}
    </svg>
  );
}
