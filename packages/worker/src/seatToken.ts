// Seat credentials become dictionary keys in room storage. Prototype names are never credentials.
export function isSeatToken(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9_-]{8,128}$/.test(value) &&
    !Object.hasOwn(Object.prototype, value)
  );
}
