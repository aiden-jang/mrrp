import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-plugin";

// Tests run inside workerd against the real Durable Object, not a mock. Nearly every rule worth
// having here is a storage rule or a seat rule, and a mock would be asserting the mock.
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.toml" },
    }),
  ],
  test: {
    /* Ten seconds rather than Vitest's five. These are round trips through a real Durable Object. */
    testTimeout: 10_000,
  },
});
