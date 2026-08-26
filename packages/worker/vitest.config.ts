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
  test: {
    /*
     * These are round trips, not unit tests, and 5s is a unit-test default.
     *
     * Every case here drives a real Durable Object through real fetches: the slowest makes forty-five
     * of them, and a dozen more sit between one and two seconds apiece. Measured on an idle machine
     * the whole suite is about thirty seconds across 148 tests, so nothing is near its limit; measured
     * with a dev server and a browser also running it stretches, and cases that normally take two
     * seconds are the ones with the least headroom against five.
     *
     * Raised rather than left, because a suite that goes red on a busy laptop teaches you to re-run it
     * instead of read it. It is not covering for anything slow: a genuine hang still fails, only later,
     * and the one case that legitimately needs longer keeps its own explicit 30s.
     */
    testTimeout: 20_000,
  },
});
