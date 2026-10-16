import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("connection feedback distinguishes offline work from live updates", async ({ page, context }) => {
  await page.goto("/");
  await page.getByPlaceholder("your name").fill("Review companion");
  await page.getByRole("button", { name: "Make a room", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("room");
  const soft = page.getByRole("button", { name: "Soft sound", exact: true });
  await expect(soft).toHaveAttribute("aria-pressed", "true");
  await soft.click();
  await page.reload();
  await expect(soft).toHaveAttribute("aria-pressed", "false");
  await soft.click();
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
