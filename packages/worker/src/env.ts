import type { Room } from "./room.js";

export interface Env {
  EVENT_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
  EVENTS?: AnalyticsEngineDataset;
  ROOM: DurableObjectNamespace<Room>;
  ASSETS: Fetcher;
  DEV_TOOLS?: string;
  AUTH_URL: string;
  WEATHER_URL: string;
}
