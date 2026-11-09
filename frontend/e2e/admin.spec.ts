/**
 * Flow 3 (FRONTEND_PROMPT §11): a new recruiter is blocked on the pending screen; an admin
 * approves them; the recruiter can now search. Also the tail of flow 2: the admin delivery log
 * shows the email and SMS (dry run) rows for recruiter feedback.
 */
import { expect, test } from "@playwright/test";

import { ACCOUNTS, signIn, signOut, verifyEmailViaMailpit } from "./helpers";

test("pending recruiter → admin approves → recruiter can search", async ({ page }) => {
  const email = `e2e-hiring-${Date.now()}@example.com`;
  const password = "correct-horse-battery-e2e";
  await page.goto("/register");
  await page.getByRole("button", { name: /I'm hiring/ }).click();
  await page.getByLabel("Full name").fill("E2E Hiring Manager");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByLabel("Company").fill("E2E Approvals Ltd");
  await page.getByRole("checkbox", { name: /I accept the/ }).click();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/recruiter\/pending$/);

  // Blocked from recruiter tools while pending.
  await page.goto("/recruiter/candidates");
  await expect(page).toHaveURL(/\/recruiter\/pending$/);

  await verifyEmailViaMailpit(page, email);
  await expect(page.getByText(/email (is )?verified/i).first()).toBeVisible();

  await page.goto("/recruiter/pending");
  await page.getByRole("button", { name: /Sign out/ }).click();
  await signIn(page, ACCOUNTS.admin);
  await expect(page).toHaveURL(/\/admin$/);
  await page.getByRole("link", { name: "Recruiters" }).first().click();
  // The queue is oldest first; page through to the new sign-up (fresh load per page, so no
  // placeholder rows from the previous page).
  const approve = page.getByRole("button", { name: `Approve E2E Hiring Manager (${email})` });
  for (let n = 1; n <= 20; n++) {
    await page.goto(`/admin/recruiters?page=${n}`);
    await expect(page.getByRole("table", { name: "Recruiters" })).toBeVisible();
    if (await approve.count()) break;
  }
  await approve.click();
  const dialog = page.getByRole("dialog", { name: "Approve recruiter" });
  await dialog.getByLabel(/Note/).fill("Welcome aboard");
  await dialog.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("E2E Hiring Manager approved")).toBeVisible();
  await expect(approve).toHaveCount(0);
  await signOut(page);

  await signIn(page, email, password);
  await expect(page).toHaveURL(/\/recruiter$/);
  await page.getByRole("link", { name: "Candidates" }).first().click();
  await expect(page.getByText(/\d+ candidates?/)).toBeVisible();
});

test("admin: feedback deliveries show email and SMS rows", async ({ page }) => {
  await signIn(page, ACCOUNTS.admin);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText("Email delivery rate")).toBeVisible();
  await page.goto("/admin/deliveries");
  const table = page.getByRole("table", { name: "Notification deliveries" });
  await expect(table).toBeVisible();
  await page.getByLabel("Channel").selectOption("sms");
  await expect(page).toHaveURL(/channel=sms/);
  await expect(table.getByText("recruiter_feedback").first()).toBeVisible();
  await page.getByLabel("Channel").selectOption("email");
  await expect(table.getByText("recruiter_feedback").first()).toBeVisible();
  await page
    .getByRole("button", { name: /^Details for/ })
    .first()
    .click();
  await expect(page.getByLabel("Provider response JSON")).toBeVisible();
});

test("admin: every admin page renders", async ({ page }) => {
  await signIn(page, ACCOUNTS.admin);
  await expect(page).toHaveURL(/\/admin$/);
  for (const [path, check] of [
    ["/admin/users", "table"],
    ["/admin/analyses", "table"],
    ["/admin/skills", "table"],
    ["/admin/skills?tab=mappings", "table"],
    ["/admin/audit-log", "table"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole(check).first()).toBeVisible();
  }
  await page.goto("/admin/moderation");
  await expect(page.getByText(/Nothing held for review|Release/).first()).toBeVisible();
});
