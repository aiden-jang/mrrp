import type { Room } from "./room.js";

export interface Env {
  /** One instance per room; a room is exactly two people. */
  ROOM: DurableObjectNamespace<Room>;
  /** The built web app, so the Worker can serve index.html for client-side routes. */
  ASSETS: Fetcher;
}
