import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.MRRP_E2E_WEB_PORT ?? 34601);
const inspector = Number(process.env.MRRP_E2E_INSPECTOR_PORT ?? 34602);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure", serviceWorkers: "block" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm exec wrangler dev --ip 127.0.0.1 --persist-to .wrangler/e2e-state --port ${port} --inspector-port ${inspector} --var AUTH_URL:http://127.0.0.1:1 --var WEATHER_URL:http://127.0.0.1:1`,
    cwd: "../worker",
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
    env: { WRANGLER_LOG_PATH: "../../.wrangler/e2e-logs/" },
  },
});
