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

const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";

/** The newest email to `to`, read from Mailpit's API (waits up to `timeoutMs`). */
export async function latestEmail(
  to: string,
  timeoutMs = 20_000,
): Promise<{ subject: string; text: string }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const search = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}&limit=1`);
    const found = (await search.json()) as { messages?: { ID: string; Subject: string }[] };
    const first = found.messages?.[0];
    if (first) {
      const message = (await (await fetch(`${MAILPIT}/api/v1/message/${first.ID}`)).json()) as {
        Text: string;
      };
      return { subject: first.Subject, text: message.Text };
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No email to ${to} in Mailpit`);
}

/** Follow the verification link from the sign-up email, on the app under test. */
export async function verifyEmailViaMailpit(page: Page, to: string) {
  const { text } = await latestEmail(to);
  const link = text.match(/https?:\/\/\S+\/verify-email\?\S+/)?.[0];
  if (!link) throw new Error(`No verification link in the email to ${to}`);
  const url = new URL(link);
  await page.goto(url.pathname + url.search);
}
