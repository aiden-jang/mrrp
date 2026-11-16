import { Hono } from "hono";
import type { Env } from "./env.js";
import { isSeatToken, ROOM_RE } from "./seatToken.js";
import type { Untrusted } from "./types.js";
const DOODLE_RE = /^[0-4]{135}$/;
const room = (env: Env, id: string) => env.ROOM.get(env.ROOM.idFromName(id));
export const replyRoutes = new Hono<{ Bindings: Env }>();

replyRoutes.post("/api/room/:id/say", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as Untrusted<"say"> | null;
  if (!ROOM_RE.test(id) || !isSeatToken(body?.me) || typeof body.text !== "string") {
    return c.json({ error: "bad request" }, 400);
  }
  const day =
    typeof body.aboutDay === "number" && Number.isInteger(body.aboutDay) && body.aboutDay >= 0
      ? body.aboutDay
      : undefined;
  if (body.drawing !== undefined && (typeof body.drawing !== "string" || !DOODLE_RE.test(body.drawing)))
    return c.json({ error: "bad drawing" }, 400);
  return c.json(await room(c.env, id).say(body.me, body.text, day, body.drawing));
});
