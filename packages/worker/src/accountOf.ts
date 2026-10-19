import { resolveSession } from "@aidenjang/auth-client";
import type { Env } from "./env.js";

// Forward sessions without their secret; distinguish outages when linking a seat.
type Caller = { state: "signed-in"; id: string } | { state: "signed-out" } | { state: "unavailable" };

export async function accountOf(request: Request, env: Env): Promise<Caller> {
  const session = await resolveSession(request, env.AUTH_URL);
  if (session.state === "signed-in") return { state: "signed-in", id: session.user.id };
  return { state: session.state };
}
