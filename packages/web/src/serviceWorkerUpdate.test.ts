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

function worker(response: Response) {
  const handlers = new Map<string, (event: unknown) => void>();
  const put = vi.fn().mockResolvedValue(undefined);
  new Function("self", "caches", "URL", "fetch", source)(
    {
      location: { origin: "https://app.test" },
      addEventListener: (key: string, handle: (event: unknown) => void) => handlers.set(key, handle),
    },
    { open: async () => ({ put }), match: async () => undefined },
    URL,
    async () => response,
  );
  return async (path: string) => {
    let reply!: Promise<Response>;
    const work: Promise<unknown>[] = [];
    handlers.get("fetch")!({
      request: { method: "GET", mode: "navigate", url: `https://app.test${path}` },
      respondWith: (answer: Promise<Response>) => {
        reply = answer;
      },
      waitUntil: (promise: Promise<unknown>) => work.push(promise),
    });
    await reply;
    await Promise.all(work);
    return { put, work };
  };
}

test.each(["/r/abc123", "/?new=1"])(
  "private or contextual navigation %s cannot replace the public offline shell",
  async (path) => {
    const result = await worker(new Response("room shell", { headers: { "content-type": "text/html" } }))(
      path,
    );
    expect(result.put).not.toHaveBeenCalled();
  },
);

test("a server failure cannot poison the offline homepage", async () => {
  const result = await worker(new Response("unavailable", { status: 503 }))("/");
  expect(result.put).not.toHaveBeenCalled();
});

test("writing the public shell extends the service worker lifetime", async () => {
  const result = await worker(new Response("public shell", { headers: { "content-type": "text/html" } }))(
    "/",
  );
  expect(result.put).toHaveBeenCalledOnce();
  expect(result.work.length).toBeGreaterThan(0);
});
