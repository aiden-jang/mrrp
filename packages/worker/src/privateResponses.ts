import type { MiddlewareHandler } from "hono";

export const privateResponses: MiddlewareHandler = async (c, next) => {
  await next();
  if (c.res.status === 101) return;
  c.header("Cache-Control", "no-store");
  c.header("Referrer-Policy", "no-referrer");
  c.header("X-Content-Type-Options", "nosniff");
};
