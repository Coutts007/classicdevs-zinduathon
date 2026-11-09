/**
 * Responsive pass: no route scrolls sideways at 360 px (the narrowest phone we support) or at
 * 768 px. Content that is wider than the screen (tables, the shortlist board) scrolls inside its
 * own box instead.
 */
import { expect, test, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./helpers";
import { ADMIN, PUBLIC, RECRUITER, SEEKER } from "./routes";

const WIDTHS = [360, 768];

async function check(page: Page, paths: string[]) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 800 });
    for (const path of paths) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} @ ${width}px scrolls sideways by ${overflow}px`).toBeLessThanOrEqual(0);
    }
  }
}

test("public", async ({ page }) => check(page, PUBLIC));
test("job seeker", async ({ page }) => {
  test.setTimeout(240_000);
  await signIn(page, ACCOUNTS.jobSeeker);
  await expect(page).toHaveURL(/\/app$/);
  await check(page, SEEKER);
});
test("recruiter", async ({ page }) => {
  test.setTimeout(240_000);
  await signIn(page, ACCOUNTS.recruiter);
  await expect(page).toHaveURL(/\/recruiter$/);
  await check(page, RECRUITER);
});
test("admin", async ({ page }) => {
  test.setTimeout(240_000);
  await signIn(page, ACCOUNTS.admin);
  await expect(page).toHaveURL(/\/admin$/);
  await check(page, ADMIN);
});
