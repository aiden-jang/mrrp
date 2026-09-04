import { defineConfig, devices } from "@playwright/test";

/**
 * The browser layer, against the real Worker and a real Durable Object.
 *
 * Everything else here tests a piece: the room's rules have 381 specs, the web's helpers have their
 * own. Neither knows whether two people can open the same room and see each other's half of it,
 * which is the only thing this app is.
 *
 * No stand-in for anything. A room needs no account, so the whole journey is the real code — the
 * Worker, the Durable Object, the socket.
 */
const WORKER_PORT = 8787;
const WEB_PORT = 30005;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Serial: both specs share one Worker and one room store, and the point is one pair's journey.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${WEB_PORT}`, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      // Its own state directory, not the one `dev:worker` uses, so a run neither depends on nor
      // litters the rooms somebody has been developing against.
      command: `pnpm exec wrangler dev --persist-to .wrangler/e2e-state --port ${WORKER_PORT}`,
      cwd: "../worker",
      port: WORKER_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "ignore",
    },
    {
      command: "pnpm run dev",
      port: WEB_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "ignore",
    },
  ],
});
