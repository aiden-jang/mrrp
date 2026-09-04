/* Every hour and day in the room is read in the timezone he set, never the server's. */

/** The hour with minutes as a fraction, so 18:30 is 18.5. */
export function hourInZone(at: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(at));
  const h = Number(parts.find((x) => x.type === "hour")?.value ?? 12);
  const m = Number(parts.find((x) => x.type === "minute")?.value ?? 0);
  // Keep the modulo. en-GB never returns 24, but an hour cycle that does would read as a whole day.
  return (h % 24) + m / 60;
}

/** A number rather than a date string, so subtracting two of them is the days between them. */
export function localDayNumber(at: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(at));
  return Math.floor(Date.parse(`${parts}T00:00:00Z`) / 86_400_000);
}
