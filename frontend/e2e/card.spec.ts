/**
 * Flow 1 (FRONTEND_PROMPT §11): a seeded job seeker with a linked GitHub account runs an analysis
 * (a fresh result is reused, so no GitHub calls are needed), sees the card, and the share link
 * works while signed out.
 */
import { expect, test } from "@playwright/test";

import { ACCOUNTS, signIn } from "./helpers";

test("job seeker: dashboard → analyse → card → share link", async ({ page, browser }) => {
  await signIn(page, ACCOUNTS.jobSeeker);
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("img", { name: /Signal Score \d+ out of 100/ })).toBeVisible();

  await page.getByRole("link", { name: "Analyse" }).first().click();
  await expect(page.getByRole("heading", { name: "Analyse @amina-demo" })).toBeVisible();
  await page.getByRole("button", { name: "Analyse my GitHub" }).click();
  await expect(page.getByText(/Strongest evidence is in/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Proven skills" })).toBeVisible();

  await page.getByRole("link", { name: "My card" }).first().click();
  await expect(page.getByText("/u/amina-demo")).toBeVisible();
  await expect(page.getByRole("switch", { name: "Recruiters can find my card" })).toBeVisible();

  await page.getByRole("link", { name: "History" }).first().click();
  await expect(page.getByRole("heading", { name: "Signal Score over time" })).toBeVisible();

  // A separate, signed-out browser context with the same config (baseURL, reduced motion).
  const shareLink = new URL("/u/amina-demo", page.url()).toString();
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const visitor = await context.newPage();
  await visitor.goto(shareLink);
  // First visit compiles the card route on the dev server: allow extra time.
  await expect(visitor.getByRole("heading", { name: "Amina Odhiambo" })).toBeVisible({ timeout: 30_000 });
  await expect(visitor.getByRole("link", { name: /Get your own card/ })).toBeVisible();
  await expect(visitor).toHaveTitle(/Signal Score \d+/);
  await context.close();
});

test("an unknown card says so", async ({ page }) => {
  await page.goto("/u/nobody-here-123");
  await expect(page.getByText("No skill card for @nobody-here-123 yet")).toBeVisible();
});
