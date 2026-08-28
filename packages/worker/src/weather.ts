/*
 * What it is doing where she is, so the window shows it.
 *
 * Coarse on purpose. The room already knows her timezone, because the light in it follows her day,
 * and a timezone is enough to know whether it is raining on her without the app ever asking anybody
 * for a location. Nothing new is stored about her and nothing about her is sent anywhere: the request
 * carries a latitude and longitude for the middle of a timezone, which is the same for every room
 * that picked it.
 */

export type Sky = "clear" | "cloud" | "rain" | "snow";

export interface Weather {
  sky: Sky;
  at: number;
}

// Half an hour. Weather does not turn over faster than that in a way a pixel window can show, and a
// room that is being read every fifteen seconds must not be asking a stranger's API every time.
export const WEATHER_STALE_MS = 30 * 60_000;

/*
 * Where to ask about, for the zones the setup panel offers first.
 *
 * Everything else falls back to the longitude the zone's own offset implies, which is right to about
 * a time zone's width, and a latitude of 40 degrees. That is wrong for the southern hemisphere and
 * for the far north, and it is still better than showing her somebody else's sky: at worst the window
 * is a plausible day rather than her day.
 */
const PLACES: Record<string, [number, number]> = {
  "America/New_York": [40.71, -74.01],
  "America/Chicago": [41.88, -87.63],
  "America/Denver": [39.74, -104.99],
  "America/Los_Angeles": [34.05, -118.24],
  "America/Toronto": [43.65, -79.38],
  "America/Vancouver": [49.28, -123.12],
  "America/Mexico_City": [19.43, -99.13],
  "America/Sao_Paulo": [-23.55, -46.63],
  "Europe/London": [51.51, -0.13],
  "Europe/Dublin": [53.35, -6.26],
  "Europe/Paris": [48.86, 2.35],
  "Europe/Berlin": [52.52, 13.4],
  "Europe/Madrid": [40.42, -3.7],
  "Europe/Rome": [41.9, 12.5],
  "Europe/Amsterdam": [52.37, 4.9],
  "Europe/Stockholm": [59.33, 18.07],
  "Europe/Warsaw": [52.23, 21.01],
  "Europe/Istanbul": [41.01, 28.98],
  "Europe/Moscow": [55.76, 37.62],
  "Asia/Dubai": [25.2, 55.27],
  "Asia/Kolkata": [19.08, 72.88],
  "Asia/Bangkok": [13.76, 100.5],
  "Asia/Singapore": [1.35, 103.82],
  "Asia/Shanghai": [31.23, 121.47],
  "Asia/Hong_Kong": [22.32, 114.17],
  "Asia/Seoul": [37.57, 126.98],
  "Asia/Tokyo": [35.68, 139.69],
  "Australia/Perth": [-31.95, 115.86],
  "Australia/Sydney": [-33.87, 151.21],
  "Australia/Melbourne": [-37.81, 144.96],
  "Pacific/Auckland": [-36.85, 174.76],
  "Africa/Cairo": [30.04, 31.24],
  "Africa/Lagos": [6.52, 3.38],
  "Africa/Johannesburg": [-26.2, 28.05],
};

export function placeFor(tz: string): [number, number] {
  const known = PLACES[tz];
  if (known) return known;

  // The zone's current offset in hours, times fifteen degrees, which is what an hour of longitude is.
  try {
    const name = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" })
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value;
    const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(name ?? "");
    if (!m) return [40, 0];
    const hours = Number(m[2]) + Number(m[3] ?? 0) / 60;
    const lon = (m[1] === "-" ? -hours : hours) * 15;
    return [40, Math.max(-180, Math.min(180, lon))];
  } catch {
    return [40, 0];
  }
}

/*
 * WMO weather codes, flattened to the four things the window can draw.
 *
 * Anything the table does not name is clear, which is the honest default: a window that shows nothing
 * unusual is right far more often than one that guesses.
 */
export function skyFor(code: number): Sky {
  if (code >= 71 && code <= 77) return "snow";
  if (code === 85 || code === 86) return "snow";
  if (code >= 51 && code <= 67) return "rain";
  if (code >= 80 && code <= 82) return "rain";
  // Bounded, not open-ended. `>= 95` swallowed every number above it, so an unknown code came back
  // as rain: the window claiming weather that is not happening, which is the one thing it must not do.
  if (code >= 95 && code <= 99) return "rain";
  if (code >= 1 && code <= 3) return "cloud";
  if (code === 45 || code === 48) return "cloud";
  return "clear";
}

/**
 * Null on anything unexpected. A window that cannot say is a window with nothing on it.
 *
 * The base URL is a binding rather than a constant so the tests can point it somewhere that refuses
 * instantly. Without that the suite calls a stranger's public API a few hundred times a run and its
 * assertions depend on the actual weather in New York.
 */
export async function lookOutside(tz: string, baseUrl: string): Promise<Sky | null> {
  const [lat, lon] = placeFor(tz);
  const url = new URL(baseUrl);
  url.searchParams.set("latitude", lat.toFixed(2));
  url.searchParams.set("longitude", lon.toFixed(2));
  url.searchParams.set("current", "weather_code");

  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    const body = (await r.json()) as { current?: { weather_code?: unknown } };
    const code = body.current?.weather_code;
    return typeof code === "number" ? skyFor(code) : null;
  } catch {
    return null;
  }
}
