import { expect, test } from "@playwright/test";

test("she draws an answer, retries it, and both can revisit it with its note", async ({ page, browser }) => {
  await page.goto("/");
  await page.getByPlaceholder("your name").fill("Review companion");
  await page.getByRole("button", { name: "Make a room", exact: true }).click();
  const context = await browser.newContext({ serviceWorkers: "block" });
  try {
    const her = await context.newPage();
    await her.goto(page.url());
    await her.getByRole("button", { name: "Go in", exact: true }).click();
    await her.getByText("Open your note", { exact: true }).click();
    await her.getByRole("button", { name: "Say something back", exact: true }).click();
    await her.getByRole("button", { name: "Draw a reply", exact: true }).click();
    const cell = her.getByRole("button", { name: "Row 1, column 1: rub out", exact: true });
    await expect(cell).toBeFocused();
    await cell.press("Space");
    await expect(her.getByRole("button", { name: "Leave it", exact: true })).toBeDisabled();
    await her.getByRole("button", { name: "Attach drawing", exact: true }).click();
    await her.route("**/say", (route) => route.abort());
    await her.getByRole("button", { name: "Leave it", exact: true }).click();
    await expect(her.getByRole("button", { name: "your drawing", exact: true })).toBeVisible();
    await expect(her.getByRole("button", { name: "Leave it", exact: true })).toBeEnabled();
    await her.unroute("**/say");
    await her.getByRole("button", { name: "Leave it", exact: true }).click();
    await expect(
      page.getByRole("img", { name: "A pixel drawing attached to this reply", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Your notes & replies", exact: true }).click();
    await expect(
      page
        .getByRole("region", { name: "Your notes & replies" })
        .getByRole("img", { name: "A pixel drawing attached to this reply" }),
    ).toBeVisible();
    await her.reload();
    await expect(
      her.getByRole("img", { name: "A pixel drawing attached to this reply", exact: true }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
