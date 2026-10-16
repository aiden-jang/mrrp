import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("connection feedback distinguishes offline work from live updates", async ({ page, context }) => {
  await page.goto("/");
  await page.getByPlaceholder("your name").fill("Review companion");
  await page.getByRole("button", { name: "Make a room", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("room");
  const mute = page.getByRole("button", { name: "Turn sound off", exact: true });
  await mute.click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Turn sound on", exact: true })).toBeVisible();
  await context.setOffline(true);
  const notice = page.getByRole("status").filter({ hasText: "You’re offline" });
  await expect(notice).toBeVisible();
  if (process.env.CAPTURE_DETAILS) {
    const folder = new URL("../../../docs/ui-review/details2-oct15/", import.meta.url).pathname;
    await mkdir(folder, { recursive: true });
    for (const [name, width, height] of [
      ["desktop", 1440, 900],
      ["mobile", 390, 844],
    ] as const) {
      await page.setViewportSize({ width, height });
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true);
      await page.screenshot({
        path: `${folder}connection-${name}.png`,
        fullPage: false,
        animations: "disabled",
      });
    }
  }
  await context.setOffline(false);
  await expect(notice).toHaveCount(0);
});

test("returning to a room refreshes its midnight reminder without a polling delay", async ({
  page,
  browser,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-16T16:00:00Z"));
  await page.goto("/");
  await page.getByPlaceholder("your name").fill("Review companion");
  await page.getByRole("button", { name: "Make a room", exact: true }).click();
  await page.getByRole("button", { name: /Write her notes/ }).click();
  await page.getByLabel("Her timezone", { exact: true }).selectOption("Europe/London");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const other = await browser.newContext();
  const her = await other.newPage();
  await her.goto(page.url());
  await her.getByRole("button", { name: "Go in", exact: true }).click();
  await page.getByRole("button", { name: "a box", exact: true }).click();
  await page.getByText("Room & account", { exact: false }).click();
  await expect(page.getByRole("link", { name: "What this keeps", exact: true })).toHaveAccessibleDescription(
    "Opens in a new tab",
  );
  const reminder = page.getByText(/the box goes at midnight where she is/);
  await expect(reminder).toContainText("in about 7 hours");
  await page.clock.setFixedTime(new Date("2026-10-16T20:00:00Z"));
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(reminder).toContainText("in about 3 hours");
  for (const [width, height] of [
    [1440, 900],
    [390, 780],
  ]) {
    await page.setViewportSize({ width: width!, height: height! });
    await reminder.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: test.info().outputPath(`room-return-${width}.png`),
      animations: "disabled",
    });
  }
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Make a postcard", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
  await expect(page.getByRole("button", { name: "Download started", exact: true })).toBeVisible();
  await other.close();
});
