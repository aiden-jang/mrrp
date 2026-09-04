/*
 * Her clock, not the server's. The room runs on whatever timezone he set, so both of them see the
 * same evening even when they are hours apart, and "today" means her today.
 */

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
  // en-GB gives "00" at midnight, so the modulo never fires here. It is what stops an hour cycle
  // that counts midnight as 24 from reading as a whole day, if the locale above ever changes.
  return (h % 24) + m / 60;
}

/*
 * Days since the epoch in her zone, which is what "same day" is compared on everywhere else.
 * Deliberately not a date string: subtracting two of these is the number of days between them.
 */
export function localDayNumber(at: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(at));
  return Math.floor(Date.parse(`${parts}T00:00:00Z`) / 86_400_000);
}
