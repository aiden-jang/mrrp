import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("he makes a room, she goes in, and each gets their own half", async ({ page, browser }) => {
  await page.goto("/");
  await page.getByPlaceholder("your name").fill("Aiden");
  await page.getByRole("button", { name: "Make a room" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toContainText("room");
  const link = page.url();
  expect(link).toMatch(/\/r\/[a-z0-9]+$/);

  // Things belong to both of them; writing her notes is his.
  await expect(page.getByRole("button", { name: "the window" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Write her notes/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Say something back/ })).toHaveCount(0);

  await page.getByRole("button", { name: /Write her notes/ }).click();
  await page.getByRole("button", { name: "Moss", exact: true }).click();
  await page.getByLabel("Rug", { exact: true }).selectOption("stripe");
  await page.getByLabel("Wall print", { exact: true }).selectOption("moon");
  await page.getByLabel("Mug", { exact: true }).selectOption("rose");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Saved. A very considered look.");
  await page.reload();
  await page.getByRole("button", { name: /Write her notes/ }).click();
  await expect(page.getByRole("button", { name: "Moss", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByLabel("Rug", { exact: true })).toHaveValue("stripe");
  await expect(page.getByLabel("Wall print", { exact: true })).toHaveValue("moon");
  await expect(page.getByLabel("Mug", { exact: true })).toHaveValue("rose");
  await page.getByRole("button", { name: "Midnight", exact: true }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: /Write her notes/ }).click();
  await expect(page.getByRole("button", { name: "Moss", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();

  const hers = await browser.newContext();
  const her = await hers.newPage();
  await her.goto(link);
  await her.getByRole("button", { name: "Go in" }).click();

  await expect(her.getByRole("heading", { level: 1 })).toContainText("room");
  // Hers, and not his: she answers and draws, she does not write herself notes.
  await expect(her.getByRole("button", { name: /Say something back/ })).toBeVisible();
  await expect(her.getByRole("button", { name: /Draw something for the frame/ })).toBeVisible();
  await expect(her.getByRole("button", { name: /Write her notes/ })).toHaveCount(0);

  await her.getByRole("button", { name: /Say something back/ }).click();
  await her.getByLabel("Your answer").fill("i fed her already");
  await page.evaluate(() => Object.defineProperty(document, "hidden", { configurable: true, value: true }));
  await her.getByRole("button", { name: "Leave it" }).click();
  await expect(page).toHaveTitle(/^• /);
  await expect(her).not.toHaveTitle(/^• /);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page).not.toHaveTitle(/^• /);

  // The box closes and the line comes back labelled as the last thing she said, which is the
  // round trip: typed here, stored in the room, read back out of a fresh view.
  await expect(her.getByLabel("Your answer")).toHaveCount(0);
  await expect(her.getByText("i fed her already")).toBeVisible();

  // Opening it again opens it empty. Saving adds a line rather than replacing one.
  await her.getByRole("button", { name: /the last thing you said to him/ }).click();
  await expect(her.getByLabel(/Your answer|Something to leave him/)).toHaveValue("");
  await her.getByRole("button", { name: "Never mind" }).click();

  // A toggle, so the control itself is the state: pressed, and offering the way back out.
  const door = her.getByRole("button", { name: /(Go and wait|Come away) / });
  await expect(door).toHaveAttribute("aria-pressed", "false");
  await door.click();
  await expect(door).toHaveAttribute("aria-pressed", "true");
  await expect(door).toHaveText(/Come away from the door/);

  await her.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => her.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (await new AxeBuilder({ page: her }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations,
  ).toEqual([]);
  await her.getByRole("button", { name: "Draw something for the frame" }).click();
  const firstCell = her.getByRole("button", { name: /^Row 1, column 1:/ });
  await expect(firstCell).toBeFocused();
  await firstCell.press("ArrowRight");
  const secondCell = her.getByRole("button", { name: /^Row 1, column 2:/ });
  await expect(secondCell).toBeFocused();
  await secondCell.press("Space");
  await expect(secondCell).toHaveAttribute("aria-label", "Row 1, column 2: ink");
  await secondCell.press("Escape");
  await expect(her.getByRole("button", { name: "Draw something for the frame" })).toBeFocused();
  await hers.close();
});
