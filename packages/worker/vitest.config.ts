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
 *
 * Do not add `singleWorker` or `isolatedStorage` here. Both were real options before 0.20 and neither
 * exists now; the options object is parsed with a schema that drops unknown keys, so they sit in the
 * file looking meaningful and do nothing at all. This config carried `singleWorker: true` for a while
 * that way.
 */
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.toml" },
    }),
  ],
  test: {
    /*
     * These are round trips, not unit tests, and 5s is a unit-test default.
     *
     * The suite gets slower as it goes, and it is worth knowing why before trying to fix a slow test.
     * Every test takes a fresh room id, so every test leaves another Durable Object alive inside the
     * one workerd instance, and each one taxes every request after it. Measured: thirty reads cost
     * 59ms in an empty instance, 145ms after fifty rooms, 339ms after a hundred, 513ms after a
     * hundred and fifty. By the end of this suite a single round trip is nearer 150ms than 2ms.
     *
     * So the tests that loop are the ones with no headroom, and they are the ones that used to fail
     * on a busy laptop under the 5s default. Raised rather than left, because a suite that goes red
     * when you have a browser open teaches you to re-run it instead of read it. A genuine hang still
     * fails, only later, and the one case that legitimately needs longer keeps its own explicit 30s.
     */
    testTimeout: 20_000,
  },
});
