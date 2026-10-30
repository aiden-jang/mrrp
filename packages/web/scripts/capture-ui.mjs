import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const base = new URL(process.env.MRRP_UI_URL ?? "http://127.0.0.1:34611");
if (
  !["http:", "https:"].includes(base.protocol) ||
  !["localhost", "127.0.0.1", "[::1]"].includes(base.hostname) ||
  base.username ||
  base.password ||
  base.pathname !== "/" ||
  base.search ||
  base.hash
)
  throw new Error("Visual review may only create disposable rooms on a local origin.");
const output = resolve(process.env.MRRP_UI_OUTPUT ?? "../../test-results/visual-review/captures");
const widths = [320, 390, 430, 768, 1440];
const browser = await chromium.launch();
await mkdir(output, { recursive: true });

async function localContext(width) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    timezoneId: "UTC",
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.origin === base.origin || ["blob:", "data:"].includes(url.protocol)
      ? route.continue()
      : route.abort();
  });
  await context.addInitScript(() => {
    localStorage.setItem("mrrp:muted", "1");
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error("Review clipboard unavailable")) },
    });
    document.execCommand = () => false;
  });
  return context;
}

async function capture(page, name, width, errors) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas?.width || !canvas.height) return false;
    const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    let painted = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) painted += 1;
    return painted > canvas.width * canvas.height * 0.9;
  });
  const findings = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  if (findings.violations.length) throw new Error(`${name} ${width}: ${JSON.stringify(findings.violations)}`);
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
    throw new Error(`${name} ${width}: horizontal overflow`);
  if (errors.length) throw new Error(`${name} ${width}: ${errors.join(", ")}`);
  // Chromium's full-page compositor can omit a painted canvas; retain real viewport captures.
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const viewport = page.viewportSize().height;
  for (let y = 0, section = 0; y < height; y += Math.floor(viewport * 0.8), section += 1) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    const suffix = section ? `-section-${section}` : "";
    await page.screenshot({ path: resolve(output, `${name}-${width}${suffix}.png`), animations: "disabled" });
    if (y + viewport >= height) break;
  }
  process.stdout.write(`Reviewed ${name} at ${width}\n`);
}

try {
  for (const width of widths) {
    const companion = await localContext(width);
    const cat = await localContext(width);
    try {
      const page = await companion.newPage();
      const her = await cat.newPage();
      const errors = [];
      for (const tab of [page, her]) tab.on("pageerror", (error) => errors.push(error.message));
      await page.clock.setFixedTime(new Date("2026-10-26T14:00:00Z"));
      await her.clock.setFixedTime(new Date("2026-10-26T14:00:00Z"));
      await page.goto(base.href);
      await page.getByRole("button", { name: "Make a room" }).waitFor();
      await capture(page, "landing", width, errors);
      await page.getByLabel("Your name", { exact: true }).fill("Review companion");
      await page.getByRole("button", { name: "Make a room" }).click();
      await page.getByRole("heading", { level: 1, name: /room/ }).waitFor();
      if (new URL(page.url()).origin !== base.origin) throw new Error("Room left the local origin");
      const room = page.url();
      await capture(page, "waiting", width, errors);
      await page.getByRole("button", { name: /Write her notes/ }).click();
      await page.getByLabel("Her name", { exact: true }).fill("Bean with a long name");
      await page.getByLabel("Her timezone", { exact: true }).selectOption("UTC");
      await page
        .getByLabel("Her notes, one per line", { exact: true })
        .fill("A quiet room, with space for whatever today feels like.\n괜찮아 🌱");
      await capture(page, "setup", width, errors);
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await page.getByRole("status").filter({ hasText: "Saved." }).waitFor();
      await page.getByRole("button", { name: "Send her the link", exact: true }).click();
      await page.getByRole("textbox", { name: "Room link to copy" }).waitFor();
      await capture(page, "invite-error", width, errors);
      await page.reload();
      await her.goto(room);
      await her.getByRole("button", { name: "Go in", exact: true }).waitFor();
      await capture(her, "invitation", width, errors);
      await her.getByRole("button", { name: "Go in", exact: true }).click();
      await her.getByRole("button", { name: /Say something back/ }).waitFor();
      await page.getByRole("button", { name: "Pet her", exact: true }).waitFor();
      await capture(page, "companion", width, errors);
      await capture(her, "cat", width, errors);
      await her.getByRole("button", { name: /Say something back/ }).click();
      await her.getByLabel("Your answer", { exact: true }).fill("괜찮아 🌱\n".repeat(20).trim());
      await capture(her, "reply", width, errors);
      await her.getByRole("button", { name: "Never mind", exact: true }).click();
      await her.getByRole("button", { name: /Draw something for the frame/ }).click();
      await her.getByRole("button", { name: /^Row 1, column 1:/ }).click();
      await capture(her, "drawing", width, errors);
      await her.getByRole("button", { name: "Never mind", exact: true }).click();
      for (const tab of [page, her]) {
        await tab.clock.setFixedTime(new Date("2026-10-26T23:00:00Z"));
        await tab.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
        await tab.waitForFunction(
          () =>
            getComputedStyle(document.querySelector("main")).getPropertyValue("--ink").trim() === "#f6f1e6",
        );
      }
      await capture(page, "companion-night", width, errors);
      await capture(her, "cat-night", width, errors);
    } finally {
      await companion.close();
      await cat.close();
    }
  }
} finally {
  await browser.close();
}
