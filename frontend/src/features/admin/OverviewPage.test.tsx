import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import type { RecruiterQueue, Stats } from "@/lib/api/types";
import { makeMe, page } from "@/test/fixtures";
import { renderApp } from "@/test/render";
import { API, server } from "@/test/server";

import { AdminOverviewPage } from "./OverviewPage";

const admin = makeMe({
  id: "admin-1",
  role: "admin",
  email: "admin@skillproof.demo",
  jobSeekerProfile: null,
});

const stats: Stats = {
  usersByRole: { job_seeker: 4, recruiter: 3, admin: 1 },
  pendingRecruiters: 2,
  analysesPerDay: [],
  averageSignalScore: null,
  feedbackSent: 0,
  feedbackHeld: 0,
  deliveryRates: {},
};

const recruiter = (over: Partial<RecruiterQueue>): RecruiterQueue => ({
  id: "r1",
  email: "otieno@kilimo.demo",
  fullName: "Otieno Kamau",
  emailVerified: true,
  company: "Kilimo AI",
  jobTitle: "CTO",
  approvalStatus: "pending",
  reviewNote: "",
  reviewedAt: null,
  createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
  ...over,
});

function useApi(queue: () => RecruiterQueue[], seen: string[] = []) {
  server.use(
    http.get(`${API}/admin/stats`, () => HttpResponse.json(stats)),
    http.get(`${API}/admin/recruiters`, ({ request }) => {
      seen.push(new URL(request.url).search);
      const rows = queue();
      return HttpResponse.json(page(rows));
    }),
  );
}

const render = () => renderApp(<AdminOverviewPage />, { user: admin, path: "/admin" });

afterEach(() => vi.useRealTimers());

describe("Admin overview: waiting for approval", () => {
  it("lists the newest pending recruiters, asking the API for newest first", async () => {
    const seen: string[] = [];
    useApi(
      () => [
        recruiter({ id: "r2", fullName: "Wanjiku Mwangi", company: "Savanna Fintech", jobTitle: "" }),
        recruiter({ id: "r1", emailVerified: false }),
      ],
      seen,
    );
    render();

    const panel = (await screen.findByRole("heading", { name: "Waiting for approval" })).closest("section")!;
    const items = await within(panel).findAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]!).getByText("Wanjiku Mwangi")).toBeInTheDocument();
    expect(within(items[0]!).getByText("Savanna Fintech")).toBeInTheDocument();
    expect(within(items[0]!).getByText("Email verified")).toBeInTheDocument();
    expect(within(items[1]!).getByText("Kilimo AI · CTO")).toBeInTheDocument();
    expect(within(items[1]!).getByText("Email not verified")).toBeInTheDocument();
    expect(within(items[1]!).getByText("5 minutes ago")).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: /Open the queue \(2\)/ })).toHaveAttribute(
      "href",
      "/admin/recruiters",
    );
    expect(seen.some((s) => s.includes("status=pending") && s.includes("ordering=newest"))).toBe(true);
  });

  it("shows at most five", async () => {
    useApi(() => Array.from({ length: 8 }, (_, i) => recruiter({ id: `r${i}`, fullName: `Person ${i}` })));
    render();
    const panel = (await screen.findByRole("heading", { name: "Waiting for approval" })).closest("section")!;
    await within(panel).findByText("Person 0");
    expect(within(panel).getAllByRole("listitem")).toHaveLength(5);
    expect(within(panel).getByRole("link", { name: /Open the queue \(8\)/ })).toBeInTheDocument();
  });

  it("says when no one is waiting", async () => {
    useApi(() => []);
    render();
    expect(await screen.findByText("No one is waiting")).toBeInTheDocument();
  });

  it("shows a new sign-up without a reload, within 15 seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let rows = [recruiter({ id: "r1", fullName: "Otieno Kamau" })];
    useApi(() => rows);
    render();
    expect(await screen.findByText("Otieno Kamau")).toBeInTheDocument();
    expect(screen.queryByText("Grace Njeri")).not.toBeInTheDocument();

    rows = [recruiter({ id: "r9", fullName: "Grace Njeri" }), ...rows];
    await vi.advanceTimersByTimeAsync(15_000);

    expect(await screen.findByText("Grace Njeri")).toBeInTheDocument();
  });
});
