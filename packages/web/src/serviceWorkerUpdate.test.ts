import source from "../public/sw.js?raw";
import { expect, test, vi } from "vitest";

test("explicit no-store update checks bypass the installed shell cache", () => {
  const handlers = new Map<string, (event: unknown) => void>();
  new Function("self", "caches", "URL", "fetch", source)(
    {
      location: { origin: "https://app.test" },
      addEventListener: (name: string, handler: (event: unknown) => void) => handlers.set(name, handler),
    },
    { match: () => Promise.resolve({}) },
    URL,
    () => Promise.resolve({ ok: false }),
  );
  const respondWith = vi.fn();
  handlers.get("fetch")!({
    request: { url: "https://app.test/", method: "GET", cache: "no-store" },
    respondWith,
  });
  expect(respondWith).not.toHaveBeenCalled();
});
