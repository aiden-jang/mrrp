import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 30005,
    strictPort: true,
    // `ws` is what carries the live channel's upgrade. Without it the socket 400s in dev only, and
    // production looks fine because the Worker serves these assets itself with no proxy in between.
    proxy: {
      "/api": {
        target: `http://localhost:${loadEnv(mode, ".", "MRRP_").MRRP_E2E_WORKER_PORT ?? 8787}`,
        ws: true,
      },
    },
  },
  test: {
    // Bound memory-heavy DOM workers without relaxing individual test deadlines.
    maxWorkers: 2,
    // e2e/ belongs to Playwright. Vitest picking those up gets as far as `test()` and then reports
    // "Playwright Test did not expect test() to be called here", which is a confusing way to say
    // "wrong runner".
    exclude: ["node_modules/**", "dist/**", "e2e/**"],
  },
}));
