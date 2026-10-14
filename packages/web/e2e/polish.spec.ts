import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}
async function accessible(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(result.violations).toEqual([]);
}

for (const width of [1440, 390, 320]) {
  test(`room setup stays usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await noOverflow(page);
    await accessible(page);
    await page.getByLabel("Your name", { exact: true }).fill("River");
    await page.getByLabel("Your name", { exact: true }).press("Enter");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("room");
    await noOverflow(page);
    await accessible(page);
    const edit = page.getByRole("button", { name: /Write her notes/ });
    await edit.click();
    const panel = page.getByRole("region", { name: "Edit notes, cat appearance, and room" });
    await expect(panel).toBeFocused();
    await expect(page.getByLabel("Her timezone", { exact: true })).toBeVisible();
    await page.getByLabel("Her name", { exact: true }).fill("Bean");
    await page.getByLabel("Her notes, one per line", { exact: true }).fill("a".repeat(300));
    await noOverflow(page);
    await accessible(page);
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(edit).toBeFocused();
    await page.getByText("How this room works", { exact: true }).click();
    await expect(page.getByText(/The cat has declined a schedule/)).toBeVisible();
    await expect(page.getByRole("link", { name: "privacy", exact: true })).toBeVisible();
  });
}

test("a failed notes fetch leaves the room closed and offers a safe retry", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Your name", { exact: true }).fill("River");
  await page.getByRole("button", { name: "Make a room" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("room");
  await page.route("**/api/room/*/notes**", (route) => route.fulfill({ status: 503, body: "offline" }));
  await page.getByRole("button", { name: /Write her notes/ }).click();
  await expect(page.getByText(/saved notes haven’t changed/)).toBeVisible();
  await expect(page.getByRole("region", { name: "Edit notes, cat appearance, and room" })).toHaveCount(0);
  await page.unroute("**/api/room/*/notes**");
  await page.getByRole("button", { name: /Write her notes/ }).click();
  await expect(page.getByLabel("Her notes, one per line", { exact: true })).toBeVisible();
});
