/**
 * Flow 2 (FRONTEND_PROMPT §11): the seeded approved recruiter searches by skill, opens a
 * candidate, sends feedback, and the job seeker sees it in their inbox. (The admin deliveries
 * check is added with the admin area in Phase 6.)
 */
import { expect, test } from "@playwright/test";

import { ACCOUNTS, signIn, signOut } from "./helpers";

test("recruiter: search → candidate → feedback → seeker inbox", async ({ page }) => {
  const message = `E2E ${Date.now()}: your duka-api tests stood out. Free for a call this week?`;

  await signIn(page, ACCOUNTS.recruiter);
  await expect(page).toHaveURL(/\/recruiter$/);
  await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();

  await page.getByRole("link", { name: "Candidates" }).first().click();
  const skills = page.getByRole("combobox", { name: /Skills/ });
  await skills.fill("Django");
  await skills.press("Enter");
  await expect(page).toHaveURL(/skills=Django/);
  await expect(page.getByText(/\d+ candidates?/)).toBeVisible();

  const amina = page.getByRole("link", { name: "Amina Odhiambo" });
  await expect(amina).toBeVisible();
  await amina.click();
  await expect(page).toHaveURL(/\/recruiter\/candidates\/amina-demo$/);
  await expect(page.getByRole("heading", { name: "Proven skills" })).toBeVisible({ timeout: 20_000 });

  await page.getByLabel("Status").selectOption("interview");
  await page.getByLabel("Message").fill(message);
  await expect(page.getByText(`${message.length}/1000`)).toBeVisible();
  await page.getByRole("button", { name: "Send feedback" }).click();
  await expect(page.locator("[data-sonner-toast]").getByText("Feedback sent", { exact: true })).toBeVisible();
  await expect(page.getByText(message).first()).toBeVisible(); // in "Feedback you sent"

  await signOut(page);
  await signIn(page, ACCOUNTS.jobSeeker);
  await expect(page).toHaveURL(/\/app$/);
  await page.goto("/app/inbox");
  await page
    .getByRole("button", { name: new RegExp(message.slice(0, 20)) })
    .first()
    .click();
  await expect(page.getByText(message).last()).toBeVisible();
});

test("recruiter: create a draft job, publish it, see ranked matches", async ({ page }) => {
  const title = `E2E Backend Engineer ${Date.now()}`;
  await signIn(page, ACCOUNTS.recruiter);
  await expect(page).toHaveURL(/\/recruiter$/);
  await page.goto("/recruiter/jobs/new");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Location").fill("Nairobi");
  await page.getByRole("combobox", { name: "Skill 1" }).fill("Django");
  await page.getByRole("button", { name: "Save as draft" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("Draft", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Open", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Ranked matches/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Amina Odhiambo" })).toBeVisible();

  // Clean up so the seeded data stays tidy.
  await page.getByRole("button", { name: "Delete job" }).click();
  await page.getByRole("button", { name: "Delete job" }).last().click();
  await expect(page).toHaveURL(/\/recruiter\/jobs$/);
});

test("recruiter: shortlist board moves a card with the menu", async ({ page }) => {
  await signIn(page, ACCOUNTS.recruiter);
  await expect(page).toHaveURL(/\/recruiter$/);
  await page.goto("/recruiter/shortlists");
  await expect(page.getByRole("region", { name: /^Saved, / })).toBeVisible();
  const menu = page.getByRole("button", { name: /^Actions for / }).first();
  const who = (await menu.getAttribute("aria-label"))!.replace("Actions for ", "");
  await menu.click();
  await page.getByRole("menuitem", { name: "Offer" }).click();
  await expect(page.getByRole("region", { name: /^Offer, / }).getByText(who)).toBeVisible();
  await page.reload();
  const card = page.getByRole("region", { name: /^Offer, / }).getByText(who);
  await expect(card).toBeVisible();
  // Move it back to Saved.
  await page.getByRole("button", { name: `Actions for ${who}` }).click();
  await page.getByRole("menuitem", { name: "Saved" }).click();
  await expect(page.getByRole("region", { name: /^Saved, / }).getByText(who)).toBeVisible();
});
