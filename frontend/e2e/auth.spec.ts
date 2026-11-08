/**
 * Auth against the real backend (docker compose + seed_demo). Run: npm run e2e
 */
import { expect, test } from "@playwright/test";

import { ACCOUNTS, DEMO_PASSWORD, signIn, signOut } from "./helpers";

test.describe("sign in and out", () => {
  test("job seeker lands on /app and can sign out", async ({ page }) => {
    await signIn(page, ACCOUNTS.jobSeeker);
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole("button", { name: "Account menu" })).toContainText("Amina");
    await signOut(page);
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login\?next=%2Fapp/);
  });

  test("approved recruiter lands on /recruiter", async ({ page }) => {
    await signIn(page, ACCOUNTS.recruiter);
    await expect(page).toHaveURL(/\/recruiter$/);
  });

  test("admin lands on /admin", async ({ page }) => {
    await signIn(page, ACCOUNTS.admin);
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("wrong password says so", async ({ page }) => {
    await signIn(page, ACCOUNTS.jobSeeker, "not-the-password");
    await expect(page.getByRole("alert")).toHaveText("Email or password is incorrect.");
  });

  test("next= brings you back after signing in", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login\?next=/);
    await page.getByLabel("Email").fill(ACCOUNTS.jobSeeker);
    await page.getByLabel("Password").fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/app$/);
  });

  test("a reload restores the session from the refresh token", async ({ page }) => {
    await signIn(page, ACCOUNTS.jobSeeker);
    await expect(page).toHaveURL(/\/app$/);
    const before = await page.evaluate(() => localStorage.getItem("skillproof.refresh"));
    await page.reload();
    await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
    await expect(page).toHaveURL(/\/app$/);
    const after = await page.evaluate(() => localStorage.getItem("skillproof.refresh"));
    expect(after).toBeTruthy();
    expect(after).not.toBe(before); // rotated
  });
});

test("a new recruiter registers and sees the pending screen", async ({ page }) => {
  const email = `e2e-recruiter-${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByRole("button", { name: /I'm hiring/ }).click();
  await page.getByLabel("Full name").fill("E2E Recruiter");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery-e2e");
  await page.getByLabel("Company").fill("E2E Testing Ltd");
  await page.getByRole("checkbox", { name: /I accept the/ }).click();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/recruiter\/pending$/);
  await expect(page.getByRole("heading", { name: "Your account is waiting for approval" })).toBeVisible();
  await expect(page.getByText("Verify your email first")).toBeVisible();
});
