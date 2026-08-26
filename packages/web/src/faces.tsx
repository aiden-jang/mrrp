/**
 * A tiny face per mood.
 *
 * Six identical text pills was the least cute thing on the page and it is the one control she touches
 * every day. Drawn as pixel grids in the same idiom as the cat rather than as emoji: emoji are somebody
 * else's art style and would sit next to hand-placed pixels looking like a paste.
 *
 * 7x5, one rect per pixel, at whatever size the caller asks for. Deliberately readable at 14px, which
 * is roughly how big they end up on a phone.
 */
// prettier-ignore
const FACES: Record<string, string[]> = {
  // Two dot eyes and a curved mouth is the whole vocabulary; diagonal marks read as punctuation at
  // this size. Eyes on row 0, mouth on rows 2 and 3, nothing else.
  good:     [".x...x.", ".......", "x.....x", ".xxxxx.", "......."],
  tired:    ["xxx.xxx", ".......", "..xxx..", ".......", "......."],
  stressed: [".x...x.", ".......", "xx.x.xx", ".......", "x......"],
  sad:      [".x...x.", ".......", ".xxxxx.", "x.....x", "......."],
  lonely:   ["..x.x..", ".......", "...xx..", ".......", "......."],
  bored:    ["xxx.xxx", ".......", "...xxx.", ".......", "......."],
  // wide manic eyes and a jagged grin
  feral:    ["x.x.x.x", ".......", "x.x.x.x", ".xxxxx.", "......."],
  // eyes gone entirely, mouth a flat line: switched off at the wall
  done:     ["xx...xx", ".......", ".xxxxx.", ".......", "......."],
  // one eye shut, mouth to one side. it is a wink, it is doing a lot of work
  horny:    [".x...xx", ".......", "..xxx..", "...x...", "......."],
};

/** Which moods have a face. Exported so a test can hold this to the mood list. */
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
