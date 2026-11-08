import { expect, type Page } from "@playwright/test";

/** Seeded by `python manage.py seed_demo` (backend). */
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "SkillProof-demo-2026";
export const ACCOUNTS = {
  jobSeeker: "amina@jobseeker.demo",
  recruiter: "grace@savanna.demo",
  admin: "admin@skillproof.demo",
};

export async function signIn(page: Page, email: string, password = DEMO_PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
}
