/**
 * Phase 4: a seeded job seeker reads recruiter feedback in the inbox, sees it in the bell, and
 * changes a notification preference (persisted by the API).
 */
import { expect, test } from "@playwright/test";

import { ACCOUNTS, signIn } from "./helpers";

test("job seeker: inbox → notifications → preferences", async ({ page }) => {
  await signIn(page, ACCOUNTS.jobSeeker);
  await expect(page).toHaveURL(/\/app$/);

  await page.goto("/app/inbox");
  const message = page.getByRole("button", { name: /Savanna/ }).first();
  await expect(message).toBeVisible();
  await message.click();
  await expect(page.getByText(/duka-api tests and CI setup stood out/).last()).toBeVisible();
  await expect(page).toHaveURL(/open=/);

  await page.getByRole("button", { name: /^Notifications/ }).click();
  await expect(page.getByRole("link", { name: "See all notifications" })).toBeVisible();
  await page.getByRole("link", { name: "See all notifications" }).click();
  await expect(page).toHaveURL(/\/app\/notifications$/);
  await expect(page.getByRole("radiogroup", { name: /Show/ })).toBeVisible();

  await page.goto("/app/settings?tab=notifications");
  const toggle = page.getByRole("switch", { name: "Analysis finished: Email" });
  await expect(toggle).toBeVisible();
  const before = await toggle.getAttribute("aria-checked");
  await toggle.click();
  await expect(toggle).not.toHaveAttribute("aria-checked", before ?? "");
  await page.reload();
  await expect(page.getByRole("switch", { name: "Analysis finished: Email" })).not.toHaveAttribute(
    "aria-checked",
    before ?? "",
  );
  // Put it back so the run is repeatable.
  await page.getByRole("switch", { name: "Analysis finished: Email" }).click();
  await expect(page.getByRole("switch", { name: "Analysis finished: Email" })).toHaveAttribute(
    "aria-checked",
    before ?? "",
  );

  await page.getByRole("tab", { name: "Privacy" }).click();
  await expect(page.getByRole("button", { name: "Download" })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  expect((await download).suggestedFilename()).toMatch(/^skillproof-export-.*\.json$/);
});
