import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";

/**
 * Tests run inside workerd against the real Durable Object, not a mock.
 *
 * That matters here: nearly every rule worth testing lives in the DO (who owns which seat, who may
 * set a mood, when a note advances). A mocked storage layer would agree with whatever the test author
 * believed, which is the exact class of bug these tests exist to catch.
 *
 * Note the shape. As of @cloudflare/vitest-pool-workers 0.20 with Vitest 4 this is a Vite *plugin*,
 * `cloudflareTest()`. The older `defineWorkersConfig` from the "/config" subpath is gone, and the
 * error you get for using it ("Missing ./config specifier") does not hint at the replacement.
 */
export default defineConfig({
  plugins: [
    cloudflareTest({
      singleWorker: true,
      wrangler: { configPath: "./wrangler.toml" },
    }),
  ],
});
