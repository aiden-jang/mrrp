import { expect, test } from "@playwright/test";

test("her chosen reactions reach him, expire, and wait during contact", async ({ page, browser }) => {
  await page.goto("/");
  await page.getByPlaceholder("your name").fill("Review companion");
  await page.getByRole("button", { name: "Make a room", exact: true }).click();
  const other = await browser.newContext({ serviceWorkers: "block" });
  try {
    const her = await other.newPage();
    await her.goto(page.url());
    await her.getByRole("button", { name: "Go in", exact: true }).click();
    await her.getByText("React", { exact: true }).click();
    for (const [label, caption] of [
      ["Dramatic flop", "flops dramatically."],
      ["Hide your face", "hides her face in her paws."],
      ["Look innocent", "looks completely innocent."],
    ]) {
      const button = her.getByRole("button", { name: label, exact: true });
      await button.focus();
      await button.press("Enter");
      const reaction = page.getByRole("status").filter({ hasText: caption });
      await expect(reaction).toBeVisible();
      await expect(button).toBeDisabled();
      await expect(page.getByRole("status").filter({ hasText: "nuzzles into your hand." })).toHaveCount(0);
      await expect(reaction).toHaveCount(0);
      await expect(button).toBeEnabled();
      await expect(button).toBeFocused();
    }
    await page.getByRole("button", { name: "Pet her", exact: true }).click();
    await expect(her.getByText("You can react once he lets go.", { exact: true })).toBeVisible();
    await expect(her.getByRole("button", { name: "Dramatic flop", exact: true })).toBeDisabled();
    await expect(her.getByRole("button", { name: "Dramatic flop", exact: true })).toBeEnabled();
    await page.reload();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: /flops dramatically|hides her face|looks completely innocent/ }),
    ).toHaveCount(0);
  } finally {
    await other.close();
  }
});
