import { defineConfig, devices } from "@playwright/test";

// Real two-seat journeys against isolated local Worker storage.
const WORKER_PORT = Number(process.env.MRRP_E2E_WORKER_PORT ?? 8787);
const WEB_PORT = Number(process.env.MRRP_E2E_WEB_PORT ?? 30005);

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Keep storage-backed journeys serial.
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
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: "ignore",
    },
    {
      command: `pnpm exec vite --port ${WEB_PORT}`,
      env: { MRRP_E2E_WORKER_PORT: String(WORKER_PORT) },
      port: WEB_PORT,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: "ignore",
    },
  ],
});
