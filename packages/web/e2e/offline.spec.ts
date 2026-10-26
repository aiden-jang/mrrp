import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "allow" });

test("the installed public shell survives room navigation and opens offline", async ({
  page,
  context,
  baseURL,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true }),
      );
  });
  await page.reload();
  await expect(page.getByRole("button", { name: "Make a room" })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.goto("/r/abc123");
  await expect(page.getByRole("heading", { name: "You’re the cat." })).toBeVisible();
  expect(await page.evaluate(async () => (await caches.match("/"))?.url)).toBe(`${baseURL}/`);
  await context.setOffline(true);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Make a room" })).toBeVisible();
});
