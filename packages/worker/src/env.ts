import type { Room } from "./room.js";

export interface Env {
  ROOM: DurableObjectNamespace<Room>;
  ASSETS: Fetcher;
  DEV_TOOLS?: string;
  AUTH_URL: string;
}
