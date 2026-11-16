import { expect, test } from "@playwright/test";

test("an app update waits for a pending affection command", async ({ page, browser }) => {
  await page.goto("/");
  await page.getByPlaceholder("your name").fill("Review companion");
  await page.getByRole("button", { name: "Make a room", exact: true }).click();
  const other = await browser.newContext({ serviceWorkers: "block" });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    const her = await other.newPage();
    await her.goto(page.url());
    await her.getByRole("button", { name: "Go in", exact: true }).click();
    await her.route("**/heract", async (route) => {
      await gate;
      await route.continue();
    });
    await her.getByRole("button", { name: "Ask for pets", exact: true }).click();
    await expect(her.getByRole("button", { name: "Sharing…", exact: true })).toBeDisabled();
    await her.route("/", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<script type="module" src="/assets/next.js"></script>',
      }),
    );
    const checked = her.waitForResponse((response) => new URL(response.url()).pathname === "/");
    await her.evaluate(() => window.dispatchEvent(new Event("focus")));
    await checked;
    await her.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    const reload = her.getByRole("button", { name: "Reload app", exact: true });
    await expect(reload).toHaveCount(0);
    release();
    await expect(reload).toBeVisible();
  } finally {
    release();
    await other.close();
  }
});

test("she requests affection, cancels it, and nuzzles during his pet", async ({ page, browser }) => {
  await page.goto("/");
  await page.getByPlaceholder("your name").fill("Review companion");
  await page.getByRole("button", { name: "Make a room", exact: true }).click();
  const other = await browser.newContext({ serviceWorkers: "block" });
  try {
    const her = await other.newPage();
    await her.goto(page.url());
    await her.getByRole("button", { name: "Go in", exact: true }).click();
    await her.getByRole("button", { name: "Ask for pets", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "is asking for pets." })).toBeVisible();
    await her.getByRole("button", { name: "Never mind", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "is asking for pets." })).toHaveCount(0);
    await her.getByRole("button", { name: "Ask for pets", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "is asking for pets." })).toBeVisible();
    await page.getByRole("button", { name: "Pet her", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "is asking for pets." })).toHaveCount(0);
    await her.getByRole("button", { name: "Nuzzle", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "nuzzles into your hand." })).toBeVisible();
    await expect(her.getByRole("button", { name: "Ask for pets", exact: true })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "nuzzles into your hand." })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("status").filter({ hasText: /asking for pets|nuzzles into/ })).toHaveCount(0);
  } finally {
    await other.close();
  }
});
