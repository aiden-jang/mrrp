interface BrushMoment {
  started: number;
  last: number;
}

/** Continuous strokes share one anticipation; a pause starts a fresh one. */
export function recordBrush(moment: BrushMoment, time: number) {
  if (time - moment.last > 250) moment.started = time;
  moment.last = time;
}

/** A little anticipation, pleasure, then composure. No persistent needs or reward meter. */
export function comfortMoment({
  time,
  brushAt,
  petDepth,
  stayDepth,
  side,
  busy,
  reduced,
}: {
  time: number;
  brushAt: BrushMoment;
  petDepth: number;
  stayDepth: number;
  side: number;
  busy: boolean;
  reduced: boolean;
}) {
  const age = time - brushAt.started;
  const released = time - brushAt.last;
  const brush = age < 0 || released > 1800 ? 0 : Math.min(1, age / 180, (1800 - released) / 850);
  const content = busy ? 0 : Math.max(brush, petDepth);
  return {
    lift: reduced || busy ? 0 : Math.round(content * 2) / 2,
    lean: reduced || busy ? 0 : (Math.sign(side) * Math.round(brush * 2)) / 2,
    softEyes: content > 0.35 || (!busy && stayDepth > 0.45),
    tailEase: busy ? 1 : 1 - Math.max(content, stayDepth * 0.8) * 0.7,
  };
}

export function peekRise(remaining: number, reduced: boolean) {
  if (reduced) return 3;
  const progress = Math.max(0, Math.min(1, 1 - remaining / 1200));
  // Ears first, a deliberate peek, then back behind the rim.
  return progress < 0.25
    ? Math.round(progress * 20)
    : progress < 0.7
      ? 5
      : Math.round(((1 - progress) / 0.3) * 5);
}

/** Pixel-snapped body motion shares the same timing in every coat and viewport. */
export function bodyOffset(
  time: number,
  state: {
    reduced: boolean;
    loaf: boolean;
    settled: boolean;
    bounce: number;
    dancing: boolean;
    play: number;
    boxPlaying: boolean;
    peeking: boolean;
    peekUntil: number;
  },
) {
  const { reduced, loaf, settled, bounce, dancing, play, boxPlaying, peeking, peekUntil } = state;
  const breath =
    reduced || !loaf ? 0 : Math.round(Math.sin(time / (settled ? 1900 : 1100)) * (settled ? 1.6 : 1));
  const hop = reduced
    ? 0
    : Math.round(bounce * 3) +
      (dancing
        ? Math.round(Math.abs(Math.sin(time / 145)) * 3)
        : play > 0.5
          ? Math.round(Math.abs(Math.sin(time / 260)) * 2)
          : 0);
  const peek = boxPlaying
    ? reduced
      ? 5
      : 4 + Math.round(Math.abs(Math.sin(time / 210)) * 3)
    : peeking
      ? peekRise(peekUntil - time, reduced)
      : 0;
  return breath - hop - peek;
}

/** Purr marks stay present and still when motion is reduced. */
export function paintPurr(
  paint: (x: number, y: number, color: string) => void,
  time: number,
  x: number,
  top: number,
  strength: number,
  reduced: boolean,
) {
  for (let i = 0; i < 2; i++) {
    const progress = reduced ? 0.25 + i * 0.4 : (time / 1500 + i * 0.5) % 1;
    const y = Math.round(top - 2 - progress * 7);
    const color = `rgba(255,255,255,${strength * (1 - progress)})`;
    paint(x, y, color);
    paint(x + 1, y - 1, color);
    paint(x + 2, y, color);
  }
}
