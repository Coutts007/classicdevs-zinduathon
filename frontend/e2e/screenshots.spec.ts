/**
 * Captures every route at 390 px and 1440 px into e2e/__screenshots__/ for human review
 * (not snapshot assertions). Run: npm run screenshots
 */
import { test, type Page } from "@playwright/test";

test.use({ reducedMotion: "no-preference" });

const WIDTHS = [
  { name: "390", width: 390, height: 844 },
  { name: "1440", width: 1440, height: 900 },
];

type Shot = { name: string; path: string; ready?: (page: Page) => Promise<void> };

const SHOTS: Shot[] = [
  { name: "landing", path: "/", ready: (p) => p.waitForTimeout(8000) }, // intro + reveal (slow under software WebGL)
  {
    name: "dev-ui",
    path: "/dev/ui",
    ready: async (p) => {
      await p
        .getByTestId("health-result")
        .getByText(/Reached the API|couldn't reach/)
        .waitFor();
      await p.waitForTimeout(1500);
    },
  },
  { name: "login", path: "/login", ready: (p) => p.waitForTimeout(2500) },
  { name: "register-role", path: "/register", ready: (p) => p.waitForTimeout(2500) },
  { name: "register-job-seeker", path: "/register?role=job_seeker", ready: (p) => p.waitForTimeout(2500) },
  { name: "register-recruiter", path: "/register?role=recruiter", ready: (p) => p.waitForTimeout(2500) },
  { name: "forgot-password", path: "/forgot-password", ready: (p) => p.waitForTimeout(2000) },
  { name: "terms", path: "/terms", ready: (p) => p.waitForTimeout(800) },
  { name: "not-found", path: "/this-does-not-exist", ready: (p) => p.waitForTimeout(800) },
];

for (const size of WIDTHS) {
  for (const shot of SHOTS) {
    test(`${shot.name} @ ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.goto(shot.path, { waitUntil: "networkidle" });
      await shot.ready?.(page);
      await page.screenshot({
        path: `e2e/__screenshots__/${shot.name}-${size.name}.png`,
        fullPage: shot.name === "dev-ui",
      });
    });
  }
}

/** Signed-in screens: one sign-in per width, then each route. */
const AUTHED: { name: string; path: string; account: string; ready?: (page: Page) => Promise<void> }[] = [
  {
    name: "public-card",
    path: "/u/amina-demo",
    account: "",
    ready: (p) => p.getByRole("heading", { name: "Proven skills" }).waitFor({ timeout: 30_000 }),
  },
  {
    name: "app-dashboard",
    path: "/app",
    account: "amina@jobseeker.demo",
    ready: (p) => p.getByText("Top skills").waitFor(),
  },
  {
    name: "app-card",
    path: "/app/card",
    account: "amina@jobseeker.demo",
    ready: (p) => p.getByRole("heading", { name: "Proven skills" }).waitFor({ timeout: 30_000 }),
  },
  {
    name: "app-history",
    path: "/app/history",
    account: "amina@jobseeker.demo",
    ready: (p) => p.getByText("Signal Score over time").waitFor(),
  },
  {
    name: "app-inbox",
    path: "/app/inbox",
    account: "amina@jobseeker.demo",
    ready: (p) => p.getByText("Savanna", { exact: false }).first().waitFor(),
  },
  {
    name: "app-notifications",
    path: "/app/notifications",
    account: "amina@jobseeker.demo",
    ready: (p) => p.getByRole("radiogroup", { name: "Show" }).waitFor(),
  },
  {
    name: "app-jobs",
    path: "/app/jobs",
    account: "amina@jobseeker.demo",
    ready: (p) => p.getByRole("button", { name: "How well do I match?" }).first().waitFor(),
  },
  {
    name: "recruiter-dashboard",
    path: "/recruiter",
    account: "grace@savanna.demo",
    ready: (p) => p.getByText("75%+ matches").first().waitFor(),
  },
  {
    name: "recruiter-candidates",
    path: "/recruiter/candidates?skills=Django",
    account: "grace@savanna.demo",
    ready: (p) => p.getByText(/\d+ candidates?/).waitFor(),
  },
  {
    name: "recruiter-candidate",
    path: "/recruiter/candidates/amina-demo",
    account: "grace@savanna.demo",
    ready: (p) => p.getByRole("heading", { name: "Proven skills" }).waitFor({ timeout: 30_000 }),
  },
  {
    name: "recruiter-jobs",
    path: "/recruiter/jobs",
    account: "grace@savanna.demo",
    ready: (p) => p.getByRole("link", { name: "New job" }).waitFor(),
  },
  {
    name: "recruiter-job-new",
    path: "/recruiter/jobs/new",
    account: "grace@savanna.demo",
    ready: (p) => p.getByRole("button", { name: "Save as draft" }).waitFor(),
  },
  {
    name: "recruiter-shortlists",
    path: "/recruiter/shortlists",
    account: "grace@savanna.demo",
    ready: (p) => p.getByRole("region", { name: /^Saved, / }).waitFor(),
  },
  {
    name: "recruiter-feedback",
    path: "/recruiter/feedback",
    account: "grace@savanna.demo",
    ready: (p) =>
      p
        .getByText(/Read|Delivered/)
        .first()
        .waitFor(),
  },
  {
    name: "admin-overview",
    path: "/admin",
    account: "admin@skillproof.demo",
    ready: (p) => p.getByText("Email delivery rate").waitFor(),
  },
  {
    name: "admin-recruiters",
    path: "/admin/recruiters",
    account: "admin@skillproof.demo",
    ready: (p) => p.getByRole("table", { name: "Recruiters" }).waitFor(),
  },
  {
    name: "admin-users",
    path: "/admin/users",
    account: "admin@skillproof.demo",
    ready: (p) => p.getByRole("table", { name: "Users" }).waitFor(),
  },
  {
    name: "admin-analyses",
    path: "/admin/analyses",
    account: "admin@skillproof.demo",
    ready: (p) => p.getByRole("table", { name: "Analyses" }).waitFor(),
  },
  {
    name: "admin-skills",
    path: "/admin/skills",
    account: "admin@skillproof.demo",
    ready: (p) => p.getByRole("table", { name: "Skill catalogue" }).waitFor(),
  },
  {
    name: "admin-deliveries",
    path: "/admin/deliveries",
    account: "admin@skillproof.demo",
    ready: (p) => p.getByRole("table", { name: "Notification deliveries" }).waitFor(),
  },
  {
    name: "admin-moderation",
    path: "/admin/moderation",
    account: "admin@skillproof.demo",
    ready: (p) =>
      p
        .getByText(/Nothing held for review|Release/)
        .first()
        .waitFor(),
  },
  {
    name: "admin-audit-log",
    path: "/admin/audit-log",
    account: "admin@skillproof.demo",
    ready: (p) => p.getByRole("table", { name: "Audit log" }).waitFor(),
  },
  {
    name: "app-settings-notifications",
    path: "/app/settings?tab=notifications",
    account: "amina@jobseeker.demo",
    ready: (p) => p.getByRole("switch").first().waitFor(),
  },
];

for (const size of WIDTHS) {
  for (const shot of AUTHED) {
    test(`${shot.name} @ ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      if (shot.account) {
        await page.goto("/login");
        await page.getByLabel("Email").fill(shot.account);
        await page.getByLabel("Password").fill(process.env.DEMO_PASSWORD ?? "SkillProof-demo-2026");
        await page.getByRole("button", { name: "Sign in" }).click();
        await page.waitForURL((u) => !u.pathname.startsWith("/login"));
      }
      await page.goto(shot.path);
      await shot.ready?.(page);
      await page.waitForTimeout(1500); // dial and panel animations settle
      await page.screenshot({ path: `e2e/__screenshots__/${shot.name}-${size.name}.png`, fullPage: true });
    });
  }
}
