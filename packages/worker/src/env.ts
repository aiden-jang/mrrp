import type { Room } from "./room.js";

export interface Env {
  /** One instance per room; a room is exactly two people. */
  ROOM: DurableObjectNamespace<Room>;
  /** The built web app, so the Worker can serve index.html for client-side routes. */
  ASSETS: Fetcher;
  /**
   * Set to "on" only in `.dev.vars`, which `wrangler dev` reads and `wrangler deploy` never uploads.
   * Undefined in production, which is what keeps the ageing route unreachable there.
   */
  DEV_TOOLS?: string;
  /** The shared identity service. Signing in is optional here; a room works with no account at all. */
  AUTH_URL: string;
}
