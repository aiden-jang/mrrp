export interface MouseMoment {
  x: number;
  y: number;
  presence: number;
  phase: "peek" | "dash" | "escape";
}

/** A tiny visitor peeks in, commits to a run, then vanishes behind the far wall. */
export function mouseRunAt(elapsed: number, duration: number): MouseMoment | null {
  if (elapsed < 0 || elapsed >= duration || duration <= 0) return null;
  const progress = elapsed / duration;
  if (progress < 0.14) {
    const peek = progress / 0.14;
    return { x: 11 + peek * 3, y: 65, presence: Math.min(1, peek * 2), phase: "peek" };
  }

  const across = Math.min(1, (progress - 0.14) / 0.72);
  const eased = across * across * (3 - 2 * across);
  const escaping = progress > 0.86;
  return {
    x: 14 + eased * 82,
    y: 65 - Math.abs(Math.sin(across * Math.PI * 8)) * 2,
    presence: escaping ? Math.max(0, 1 - (progress - 0.86) / 0.14) : 1,
    phase: escaping ? "escape" : "dash",
  };
}
