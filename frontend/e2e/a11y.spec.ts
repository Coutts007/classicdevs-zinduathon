/**
 * Accessibility (FRONTEND_PROMPT §11): axe on every route, as each role. Zero serious or
 * critical violations. WCAG 2.1 A/AA rules.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./helpers";
import { ADMIN, PUBLIC, RECRUITER, SEEKER } from "./routes";

async function audit(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400); // panels fade in
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = result.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const report = serious.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.nodes
        .map((n) => n.target.join(" "))
        .slice(0, 4)
        .join(" | ")}`,
  );
  expect(report, `${path}\n${report.join("\n")}`).toEqual([]);
}

test("public pages", async ({ page }) => {
  for (const path of PUBLIC) await audit(page, path);
});
test("job seeker pages", async ({ page }) => {
  test.setTimeout(180_000);
  await signIn(page, ACCOUNTS.jobSeeker);
  await expect(page).toHaveURL(/\/app$/);
  for (const path of SEEKER) await audit(page, path);
});
test("recruiter pages", async ({ page }) => {
  test.setTimeout(180_000);
  await signIn(page, ACCOUNTS.recruiter);
  await expect(page).toHaveURL(/\/recruiter$/);
  for (const path of RECRUITER) await audit(page, path);
});
test("admin pages", async ({ page }) => {
  test.setTimeout(180_000);
  await signIn(page, ACCOUNTS.admin);
  await expect(page).toHaveURL(/\/admin$/);
  for (const path of ADMIN) await audit(page, path);
});
