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
 * that way. Neither is the answer to a slow suite either; test/harness.ts says what is.
 */
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.toml" },
    }),
  ],
  test: {
    /*
     * Ten seconds rather than Vitest's five. These are round trips through a real Durable Object, not
     * unit tests, and the first test in a file wears that file's import cost as well.
     *
     * It used to be twenty, to cover a suite that got quadratically slower as it ran. That is fixed
     * (see test/harness.ts): the slowest test in here is now under half a second, so this is headroom
     * for a loaded machine and nothing else. If something in here ever needs more than ten seconds,
     * the thing to look at is the test.
     */
    testTimeout: 10_000,
  },
});
