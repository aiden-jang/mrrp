import { expect, test } from "@playwright/test";

test("room updates wait for notes, appearance, drawing, date, reply and gift drafts", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await page.getByLabel("Your name", { exact: true }).fill("Review companion");
  await page.getByRole("button", { name: "Make a room", exact: true }).click();
  const catContext = await browser.newContext();
  try {
    const cat = await catContext.newPage();
    await cat.goto(page.url());
    await cat.getByRole("button", { name: "Go in", exact: true }).click();
    await page.getByRole("button", { name: "Write her notes", exact: true }).click();
    await page.getByLabel("Note for day 1", { exact: true }).fill("Keep these words.");
    for (const tab of [page, cat]) {
      await tab.route("/", (route) =>
        route.fulfill({
          contentType: "text/html",
          body: '<script type="module" src="/assets/next.js"></script>',
        }),
      );
      await tab.evaluate(() => window.dispatchEvent(new Event("focus")));
    }
    const reload = page.getByRole("button", { name: "Reload app", exact: true });
    await expect(reload).toHaveCount(0);
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(reload).toBeVisible();
    await page.getByRole("button", { name: "Change the cat and room", exact: true }).click();
    await expect(reload).toHaveCount(0);
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(reload).toBeVisible();
    await page.getByRole("button", { name: "Draw something for the frame", exact: true }).click();
    await expect(reload).toHaveCount(0);
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(reload).toBeVisible();
    await page.locator("#room-account > summary").click();
    await page.getByText("a day worth remembering", { exact: true }).click();
    await page.getByLabel("The date", { exact: true }).fill("2000-02-29");
    await page.getByLabel("What the day is", { exact: true }).fill("Our day");
    await expect(reload).toHaveCount(0);
    await page.getByRole("button", { name: "Keep this day", exact: true }).click();
    await expect(reload).toBeVisible();
    const catReload = cat.getByRole("button", { name: "Reload app", exact: true });
    await expect(catReload).toBeVisible();
    await cat.getByRole("button", { name: /Say something back/ }).click();
    await cat.getByLabel("Your answer", { exact: true }).fill("Keep my reply.");
    await expect(catReload).toHaveCount(0);
    await cat.getByRole("button", { name: "Never mind", exact: true }).click();
    await expect(catReload).toBeVisible();
    const gift = cat.getByLabel("Something to say with the thing you leave him", { exact: true });
    await gift.fill("Keep my gift words.");
    await expect(catReload).toHaveCount(0);
    await gift.fill("");
    await expect(catReload).toBeVisible();
  } finally {
    await catContext.close();
  }
});
